const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const crypto = require('crypto');

const prisma = require('../prisma/client');
const router = express.Router();

// Middleware to protect all routes in this file
router.use(authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']));

// Helper function to recursively get all material and work requirements
const getProductionPlan = async (tx, prodId, requiredQty, neededFor = '') => {
  const components = await tx.productComponent.findMany({
    where: { productId: prodId },
    include: { component: true },
  });

  const assemblyWork = await tx.productoTrabajoArmado.findMany({
      where: { productId: prodId },
      include: { trabajo: true }
  });

  if (components.length === 0 && neededFor) {
      throw new Error(`El sub-ensamble '${neededFor}' no tiene una receta de componentes definida.`);
  }

  let requiredMaterials = new Map();
  let requiredWork = new Map();
  let insufficientStockItems = []; // Array to track items with insufficient stock

  assemblyWork.forEach(aw => {
      const currentQty = requiredWork.get(aw.trabajo.id)?.quantity || 0;
      requiredWork.set(aw.trabajo.id, { work: aw.trabajo, quantity: currentQty + requiredQty });
  });

  for (const item of components) {
    const component = item.component;
    const totalRequiredForThisLevel = item.quantity * requiredQty;

    if (component.type === 'RAW_MATERIAL') {
      if (component.stock < totalRequiredForThisLevel) {
        // Don't throw an error, just record the insufficient item
        insufficientStockItems.push({
            product: component,
            required: totalRequiredForThisLevel,
            available: component.stock,
        });
      }
      const currentQty = requiredMaterials.get(component.id)?.quantity || 0;
      requiredMaterials.set(component.id, { product: component, quantity: currentQty + totalRequiredForThisLevel });
    } 
    else if (component.type === 'PRE_ASSEMBLED') {
      if (component.stock < totalRequiredForThisLevel) {
        const subPlan = await getProductionPlan(tx, component.id, totalRequiredForThisLevel, component.description);
        
        subPlan.rawMaterials.forEach((value, key) => {
          const currentQty = requiredMaterials.get(key)?.quantity || 0;
          requiredMaterials.set(key, { product: value.product, quantity: currentQty + value.quantity });
        });
        subPlan.workItems.forEach((value, key) => {
            const currentQty = requiredWork.get(key)?.quantity || 0;
            requiredWork.set(key, { work: value.work, quantity: currentQty + value.quantity });
        });
        // Aggregate insufficient stock items from the sub-plan
        insufficientStockItems = insufficientStockItems.concat(subPlan.insufficientStock);

      } else {
        const currentQty = requiredMaterials.get(component.id)?.quantity || 0;
        requiredMaterials.set(component.id, { product: component, quantity: currentQty + totalRequiredForThisLevel });
      }
    }
  }
  // Return the plan details along with any stock shortages
  return { rawMaterials: requiredMaterials, workItems: requiredWork, insufficientStock: insufficientStockItems };
};

// POST /api/external-production-orders - Crear o Simular una orden de producción externa
router.post('/', async (req, res) => {
  const { mode } = req.query; // 'dry-run' or 'commit'
  const { armadorId, productId, quantity, expectedCompletionDate, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId y una cantidad positiva son requeridos.' });
  }

  // --- DRY RUN / SIMULATION MODE ---
  if (mode === 'dry-run') {
    try {
      const { rawMaterials, workItems, insufficientStock } = await getProductionPlan(prisma, productId, quantity);
      
      const materialsList = Array.from(rawMaterials.values());
      const workList = Array.from(workItems.values());

      const totalCost = workList.reduce((acc, item) => acc + (Number(item.work.precio) * item.quantity), 0);

      // Return the plan, including the list of items with insufficient stock
      return res.json({
        requiredMaterials: materialsList,
        assemblySteps: workList,
        totalAssemblyCost: totalCost,
        insufficientStockItems: insufficientStock,
      });

    } catch (error) {
      // This will now only catch unexpected errors, not stock issues
      return res.status(400).json({ error: `Simulación fallida: ${error.message}` });
    }
  }

  // --- COMMIT MODE ---
  if (!armadorId) {
    return res.status(400).json({ error: 'armadorId es requerido para crear la orden.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // First, get the plan to check for stock issues before committing
      const { rawMaterials, insufficientStock } = await getProductionPlan(tx, productId, quantity);

      // CRITICAL CHECK: If any item has insufficient stock, abort the transaction.
      if (insufficientStock.length > 0) {
        const errorItem = insufficientStock[0];
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

      for (const [, { product, quantity: requiredQty }] of rawMaterials) {
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
router.get('/', async (req, res) => {
  const { status } = req.query;
  const where = {};

  if (status) {
    where.status = { in: status.split(',') };
  }

  try {
    const orders = await prisma.externalProductionOrder.findMany({
      where,
      include: {
        armador: true,
        deliveryUser: { select: { id: true, name: true } },
        items: { include: { product: { select: { description: true, internalCode: true } } } },
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
router.put('/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { deliveryUserId } = req.body;

  try {
    const order = await prisma.externalProductionOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!['PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot assign order in ${order.status} state.` });
    }

    const updatedOrder = await prisma.externalProductionOrder.update({
      where: { id },
      data: {
        deliveryUserId: deliveryUserId || null,
        status: deliveryUserId ? 'OUT_FOR_DELIVERY' : 'PENDING_DELIVERY',
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error assigning order ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to assign order.' });
  }
});

// POST /api/external-production-orders/:id/cancel - Cancelar una orden
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const userPerformingReversalId = req.user.userId;

  try {
    const orderToCancel = await prisma.externalProductionOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!orderToCancel) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (orderToCancel.status !== 'PENDING_DELIVERY') {
      return res.status(400).json({ error: `Order cannot be cancelled in ${orderToCancel.status} state. It must be PENDING_DELIVERY.` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const eventId = crypto.randomUUID();

      for (const item of orderToCancel.items) {
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'ADJUSTMENT_IN',
            quantity: item.quantitySent,
            userId: userPerformingReversalId,
            notes: `Reversión por cancelación de orden externa #${id}`,
            eventId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantitySent } },
        });
      }

      const cancelledOrder = await tx.externalProductionOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return cancelledOrder;
    });

    res.json(result);

  } catch (error) {
    console.error(`Error cancelling order ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
});

// POST /:id/confirm-delivery - Confirmar entrega de materiales al armador
router.post('/:id/confirm-delivery', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.externalProductionOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

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
});

// POST /:id/report-failure - Reportar una entrega fallida
router.post('/:id/report-failure', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const order = await prisma.externalProductionOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

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
});

// POST /:id/confirm-assembly - Supervisor confirms assembly is finished
router.post('/:id/confirm-assembly', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.externalProductionOrder.findUnique({
      where: { id },
    });

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
router.post('/:id/assign-pickup', async (req, res) => {
  const { id } = req.params;
  const { pickupUserId } = req.body;

  if (!pickupUserId) {
    return res.status(400).json({ error: 'pickupUserId is required' });
  }

  try {
    const order = await prisma.externalProductionOrder.findUnique({
      where: { id },
    });

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
        pickupUserId: pickupUserId,
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error assigning pickup for order ${id}:`, error);
    res.status(500).json({ error: 'Failed to assign pickup' });
  }
});

// POST /:id/receive - Receive finished goods from an assembler
router.post('/:id/receive', async (req, res) => {
  const { id } = req.params;
  const { receivedItems, justified, notes } = req.body;
  const userId = req.user.id;

  if (!receivedItems || !Array.isArray(receivedItems)) {
    return res.status(400).json({ error: 'receivedItems must be an array.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.externalProductionOrder.findUnique({
        where: { id },
        include: { expectedOutputs: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

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
          await tx.product.update({
            where: { id: expected.productId },
            data: { stock: { increment: receivedQty } },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: expected.productId,
              type: 'RECEIVED_FROM_ASSEMBLER',
              quantity: receivedQty,
              userId: userId,
              notes: `Recepción de orden externa #${order.id}`,
              eventId,
            },
          });
        }
      }

      // Determine the final status based on discrepancy and justification
      let finalStatus;
      if (!isDiscrepancy) {
        finalStatus = 'COMPLETED';
      } else {
        finalStatus = justified ? 'COMPLETED_WITH_NOTES' : 'COMPLETED_WITH_DISCREPANCY';
      }

      const updatedOrder = await tx.externalProductionOrder.update({
        where: { id },
        data: { 
          status: finalStatus,
          notes: order.notes ? `${order.notes}\n${notes || ''}` : notes || null
        }, 
      });

      return updatedOrder;
    });

    res.json(result);
  } catch (error) {
    console.error(`Error receiving order ${id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
