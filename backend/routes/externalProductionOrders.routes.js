const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRole } = require('../authMiddleware');
const crypto = require('crypto');

const prisma = new PrismaClient();
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

  assemblyWork.forEach(aw => {
      const currentQty = requiredWork.get(aw.trabajo.id)?.quantity || 0;
      requiredWork.set(aw.trabajo.id, { work: aw.trabajo, quantity: currentQty + requiredQty });
  });

  for (const item of components) {
    const component = item.component;
    const totalRequiredForThisLevel = item.quantity * requiredQty;

    if (component.type === 'RAW_MATERIAL') {
      if (component.stock < totalRequiredForThisLevel) {
        throw new Error(`Stock insuficiente para el material base: ${component.description}. Necesario: ${totalRequiredForThisLevel}, Disponible: ${component.stock}`);
      }
      const currentQty = requiredMaterials.get(component.id)?.quantity || 0;
      requiredMaterials.set(component.id, { product: component, quantity: currentQty + totalRequiredForThisLevel });
    } 
    else if (component.type === 'PRE_ASSEMBLED') {
      if (component.stock < totalRequiredForThisLevel) {
        const { rawMaterials: subAssemblyMaterials, workItems: subAssemblyWork } = await getProductionPlan(tx, component.id, totalRequiredForThisLevel, component.description);
        
        subAssemblyMaterials.forEach((value, key) => {
          const currentQty = requiredMaterials.get(key)?.quantity || 0;
          requiredMaterials.set(key, { product: value.product, quantity: currentQty + value.quantity });
        });
        subAssemblyWork.forEach((value, key) => {
            const currentQty = requiredWork.get(key)?.quantity || 0;
            requiredWork.set(key, { work: value.work, quantity: currentQty + value.quantity });
        });

      } else {
        const currentQty = requiredMaterials.get(component.id)?.quantity || 0;
        requiredMaterials.set(component.id, { product: component, quantity: currentQty + totalRequiredForThisLevel });
      }
    }
  }
  return { rawMaterials: requiredMaterials, workItems: requiredWork };
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
      const { rawMaterials, workItems } = await getProductionPlan(prisma, productId, quantity);
      
      const materialsList = Array.from(rawMaterials.values());
      const workList = Array.from(workItems.values());

      const totalCost = workList.reduce((acc, item) => acc + (Number(item.work.precio) * item.quantity), 0);

      return res.json({
        requiredMaterials: materialsList,
        assemblySteps: workList,
        totalAssemblyCost: totalCost,
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
      const { rawMaterials } = await getProductionPlan(tx, productId, quantity);

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

module.exports = router;
