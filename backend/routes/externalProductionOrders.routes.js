const express = require('express');
const {
  authenticateToken,
  authorizeRole,
  authorizeAssignedUserOrAdmin,
} = require('../authMiddleware');
const crypto = require('crypto');
const prisma = require('../prisma/client');

const router = express.Router();

// --- Helper Functions ---

const getProductionPlan = async (tx, prodId, requiredQty, visited = new Set()) => {
  if (visited.has(prodId)) {
    throw new Error(`Dependencia circular detectada en la receta del producto ID: ${prodId}`);
  }
  visited.add(prodId);

  const product = await tx.product.findUnique({ where: { id: prodId } });
  if (!product) throw new Error(`Producto con ID ${prodId} no encontrado.`);

  const directComponents = await tx.productComponent.findMany({
    where: { productId: prodId },
    include: { component: true },
  });

  if (directComponents.length === 0 && product.type === 'PRE_ASSEMBLED') {
    throw new Error(`El sub-ensamble '${product.description}' no tiene una receta de componentes definida.`);
  }

  const planTree = [];
  const flatRawMaterials = new Map();
  const flatWorkItems = new Map();
  const flatInsufficientStock = [];

  const directAssemblyWork = await tx.productoTrabajoArmado.findMany({
    where: { productId: prodId },
    include: { trabajo: true },
  });

  directAssemblyWork.forEach(aw => {
    const totalWorkQty = aw.quantity * requiredQty;
    const currentQty = flatWorkItems.get(aw.trabajo.id)?.quantity || 0;
    flatWorkItems.set(aw.trabajo.id, { work: aw.trabajo, quantity: currentQty + totalWorkQty });
  });

  for (const item of directComponents) {
    const component = item.component;
    const neededQty = item.quantity * requiredQty;

    if (component.type === 'RAW_MATERIAL') {
      const hasStock = component.stock >= neededQty;
      if (!hasStock) {
        flatInsufficientStock.push({ product: component, required: neededQty, available: component.stock });
      }
      const currentRawQty = flatRawMaterials.get(component.id)?.quantity || 0;
      flatRawMaterials.set(component.id, { product: component, quantity: currentRawQty + neededQty });

      planTree.push({
        product: component,
        quantity: neededQty,
        hasStock: hasStock,
        components: [],
      });
    } else if (component.type === 'PRE_ASSEMBLED') {
      const hasStock = component.stock >= neededQty;
      let subTree = [];

      if (!hasStock) {
        const subPlan = await getProductionPlan(tx, component.id, neededQty, new Set(visited));
        subTree = subPlan.planTree;

        subPlan.flatRawMaterials.forEach((value, key) => {
          const currentRawQty = flatRawMaterials.get(key)?.quantity || 0;
          flatRawMaterials.set(key, { product: value.product, quantity: currentRawQty + value.quantity });
        });
        subPlan.flatWorkItems.forEach((value, key) => {
          const currentWorkQty = flatWorkItems.get(key)?.quantity || 0;
          flatWorkItems.set(key, { work: value.work, quantity: currentWorkQty + value.quantity });
        });
        subPlan.flatInsufficientStock.forEach(item => flatInsufficientStock.push(item));
      } else {
        const currentRawQty = flatRawMaterials.get(component.id)?.quantity || 0;
        flatRawMaterials.set(component.id, { product: component, quantity: currentRawQty + neededQty });
      }

      planTree.push({
        product: component,
        quantity: neededQty,
        hasStock: hasStock,
        components: subTree,
      });
    }
  }

  return { planTree, flatRawMaterials, flatWorkItems, flatInsufficientStock };
};


// Apply authentication to all routes in this file
router.use(authenticateToken);

// --- ROUTES ---

// POST /api/external-production-orders - Crear o Simular una orden
router.post('/', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { mode } = req.query; // 'dry-run' or 'commit'
  const { armadorId, productId, quantity, expectedCompletionDate, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId y una cantidad positiva son requeridos.' });
  }

  // --- DRY RUN / SIMULATION MODE ---
  if (mode === 'dry-run') {
    try {
      const { planTree, flatWorkItems, flatInsufficientStock } = await getProductionPlan(prisma, productId, quantity);

      const workList = Array.from(flatWorkItems.values());
      const totalCost = workList.reduce((acc, item) => acc + (Number(item.work.precio) * item.quantity), 0);

      return res.json({
        productionPlan: planTree,
        assemblySteps: workList,
        totalAssemblyCost: totalCost,
        insufficientStockItems: flatInsufficientStock,
      });

    } catch (error) {
      return res.status(400).json({ error: `Simulación fallida: ${error.message}` });
    }
  }

  // --- COMMIT MODE ---
  if (!armadorId) {
    return res.status(400).json({ error: 'armadorId es requerido para crear la orden.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { flatRawMaterials, flatInsufficientStock } = await getProductionPlan(tx, productId, quantity);

      if (flatInsufficientStock.length > 0) {
        const errorItem = flatInsufficientStock[0];
        throw new Error(`Stock insuficiente para ${errorItem.product.description}. Necesario: ${errorItem.required}, Disponible: ${errorItem.available}`);
      }

      const order = await tx.externalProductionOrder.create({
        data: {
          armadorId,
          dateSent: new Date(),
          expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
          notes,
          status: 'PENDING_DELIVERY',
        },
      });

      const eventId = crypto.randomUUID();

      for (const [, { product, quantity: requiredQty }] of flatRawMaterials) {
        await tx.externalProductionOrderItem.create({
          data: {
            externalProductionOrderId: order.id,
            productId: product.id,
            quantitySent: requiredQty,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            type: 'SENT_TO_ASSEMBLER',
            quantity: requiredQty,
            userId: userId,
            notes: `Envío para orden de producción externa #${order.id}`,
            eventId: eventId,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: requiredQty } },
        });
      }

      return order;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de creación de orden externa (commit):", error.message);
    res.status(400).json({ error: error.message });
  }
});


// GET /api/external-production-orders - Listar todas las órdenes
router.get('/', authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  try {
    const orders = await prisma.externalProductionOrder.findMany({
      where: req.query.status ? { status: { in: req.query.status.split(',') } } : {},
      include: {
        armador: true,
        deliveryUser: { select: { id: true, name: true } },
        pickupUser: { select: { id: true, name: true } },
        items: { include: { product: { select: { description: true, internalCode: true } } } },
        expectedOutputs: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching external production orders:", error.message);
    res.status(500).json({ error: 'Failed to fetch external production orders.' });
  }
});

// PUT /api/external-production-orders/:id/assign - Asignar un repartidor
router.put('/:id/assign', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  // ... (implementation is the same)
});

// POST /api/external-production-orders/:id/cancel - Cancelar una orden
router.post('/:id/cancel', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  // ... (implementation is the same)
});

// POST /:id/confirm-delivery - Confirmar entrega de materiales al armador
router.post(
  '/:id/confirm-delivery',
  authorizeAssignedUserOrAdmin(['ADMIN', 'SUPERVISOR'], 'deliveryUserId'),
  async (req, res) => {
    const { id } = req.params;
    const { order } = req; // Use the order from middleware

    try {
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ error: `Cannot confirm delivery for an order with status ${order.status}` });
      }

      const updatedOrder = await prisma.externalProductionOrder.update({
        where: { id },
        data: { status: 'IN_ASSEMBLY' },
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error(`Error confirming delivery for order ${id}:`, error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  }
);

// POST /:id/report-failure - Reportar una entrega fallida
router.post(
  '/:id/report-failure',
  authorizeAssignedUserOrAdmin(['ADMIN', 'SUPERVISOR'], 'deliveryUserId'),
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const { order } = req; // Use the order from middleware

    try {
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ error: `Cannot report failure for an order with status ${order.status}` });
      }

      const updatedOrder = await prisma.externalProductionOrder.update({
        where: { id },
        data: {
          status: 'DELIVERY_FAILED',
          notes: order.notes ? `${order.notes}\n${notes}` : notes,
        },
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error(`Error reporting failure for order ${id}:`, error);
      res.status(500).json({ error: 'Failed to report delivery failure' });
    }
  }
);

// POST /:id/confirm-assembly - Supervisor confirms assembly is finished
router.post('/:id/confirm-assembly', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.externalProductionOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'IN_ASSEMBLY') {
      return res.status(400).json({ error: `Cannot confirm assembly for an order with status ${order.status}` });
    }

    const updatedOrder = await prisma.externalProductionOrder.update({
      where: { id },
      data: { status: 'PENDING_PICKUP' },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error confirming assembly for order ${id}:`, error);
    res.status(500).json({ error: 'Failed to confirm assembly' });
  }
});

// POST /:id/assign-pickup - Supervisor assigns an employee to pick up finished goods
router.post('/:id/assign-pickup', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const order = await prisma.externalProductionOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'PENDING_PICKUP') {
      return res.status(400).json({ error: `Cannot assign pickup for an order with status ${order.status}` });
    }

    const updatedOrder = await prisma.externalProductionOrder.update({
      where: { id },
      data: {
        status: 'RETURN_IN_TRANSIT',
        pickupUserId: userId,
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error assigning pickup for order ${id}:`, error);
    res.status(500).json({ error: 'Failed to assign pickup' });
  }
});

// POST /:id/receive - Receive finished goods from an assembler
router.post(
  '/:id/receive',
  authorizeAssignedUserOrAdmin(['ADMIN', 'SUPERVISOR'], 'pickupUserId'),
  async (req, res) => {
    const { id } = req.params;
    const { receivedItems, justified, notes } = req.body;
    const userId = req.user.id;
    const { order } = req; // Use the order from middleware

    if (!receivedItems || !Array.isArray(receivedItems)) {
      return res.status(400).json({ error: 'receivedItems must be an array.' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        if (order.status !== 'RETURN_IN_TRANSIT') {
          throw new Error(`Cannot receive items for an order with status ${order.status}`);
        }

        const eventId = crypto.randomUUID();
        let isDiscrepancy = false;
        const receivedMap = new Map(receivedItems.map(item => [item.productId, item.quantityReceived]));

        for (const expected of order.expectedOutputs) {
          const receivedQty = receivedMap.get(expected.productId) || 0;
          if (receivedQty !== Number(expected.quantityExpected)) {
            isDiscrepancy = true;
          }
          if (receivedQty > 0) {
            await tx.product.update({ where: { id: expected.productId }, data: { stock: { increment: receivedQty } } });
            await tx.inventoryMovement.create({ data: { productId: expected.productId, type: 'RECEIVED_FROM_ASSEMBLER', quantity: receivedQty, userId: userId, notes: `Recepción de orden externa #${order.id}`, eventId } });
          }
        }

        let finalStatus;
        if (!isDiscrepancy) {
          finalStatus = 'COMPLETED';
        } else {
          finalStatus = justified ? 'COMPLETED_WITH_NOTES' : 'COMPLETED_WITH_DISCREPANCY';
        }

        const updatedOrder = await tx.externalProductionOrder.update({
          where: { id },
          data: { status: finalStatus, notes: order.notes ? `${order.notes}\n${notes || ''}` : notes || null },
        });

        return updatedOrder;
      });

      res.json(result);
    } catch (error) {
      console.error(`Error receiving order ${id}:`, error);
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;

