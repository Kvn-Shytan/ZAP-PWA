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

  const directAssemblyWork = await tx.productAssemblyJob.findMany({
    where: { productId: prodId },
    include: { assemblyJob: true },
  });

  directAssemblyWork.forEach(aw => {
    const totalWorkQty = 1 * requiredQty;
    const currentQty = flatWorkItems.get(aw.assemblyJob.id)?.quantity || 0;
    flatWorkItems.set(aw.assemblyJob.id, { assemblyJob: aw.assemblyJob, quantity: currentQty + totalWorkQty });
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
          flatWorkItems.set(key, { assemblyJob: value.assemblyJob, quantity: currentWorkQty + value.quantity });
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

// POST /api/external-production-orders - Create or Simulate an order
router.post('/', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { mode } = req.query; // 'dry-run' or 'commit'
  const { assemblerId, productId, quantity, expectedCompletionDate, notes, includeSubAssemblies = [] } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId y una cantidad positiva son requeridos.' });
  }

  // --- DRY RUN / SIMULATION MODE ---
  if (mode === 'dry-run') {
    try {
      // Start with the main product
      const mainPlan = await getProductionPlan(prisma, productId, quantity);
      
      // Create a map for quick lookup of top-level plan items
      const planMap = new Map(mainPlan.planTree.map(item => [item.product.id, item]));

      // Calculate plans for all additionally included sub-assemblies
      for (const subAssembly of includeSubAssemblies) {
        const subPlan = await getProductionPlan(prisma, subAssembly.productId, subAssembly.quantity);
        
        // Merge sub-plan results into the main plan
        subPlan.planTree.forEach(subItem => {
          if (planMap.has(subItem.product.id)) {
            // If item already exists, just add quantity
            const existingItem = planMap.get(subItem.product.id);
            existingItem.quantity += subItem.quantity;
          } else {
            // If it's a new item, add it to the plan and the map
            mainPlan.planTree.push(subItem);
            planMap.set(subItem.product.id, subItem);
          }
        });

        subPlan.flatRawMaterials.forEach((value, key) => {
          const current = mainPlan.flatRawMaterials.get(key) || { product: value.product, quantity: 0 };
          mainPlan.flatRawMaterials.set(key, { ...current, quantity: current.quantity + value.quantity });
        });
        subPlan.flatWorkItems.forEach((value, key) => {
          const current = mainPlan.flatWorkItems.get(key) || { assemblyJob: value.assemblyJob, quantity: 0 };
          mainPlan.flatWorkItems.set(key, { ...current, quantity: current.quantity + value.quantity });
        });
        mainPlan.flatInsufficientStock.push(...subPlan.flatInsufficientStock);
      }

      const workList = Array.from(mainPlan.flatWorkItems.values());
      const totalCost = workList.reduce((acc, item) => acc + (Number(item.assemblyJob.price) * item.quantity), 0);

      return res.json({
        productionPlan: mainPlan.planTree,
        assemblySteps: workList.map(item => ({...item.assemblyJob, quantity: item.quantity })),
        totalAssemblyCost: totalCost,
        insufficientStockItems: mainPlan.flatInsufficientStock,
      });

    } catch (error) {
      console.error("Dry-run simulation failed:", error);
      return res.status(400).json({ error: `Simulación fallida: ${error.message}` });
    }
  }

  // --- COMMIT MODE ---
  if (!assemblerId) {
    return res.status(400).json({ error: 'assemblerId es requerido para crear la orden.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Consolidate main product and sub-assemblies into one list to plan
      const productsToPlan = [{ productId, quantity }, ...includeSubAssemblies];
      
      // Placeholders for the consolidated plan
      const consolidated = {
        flatRawMaterials: new Map(),
        flatWorkItems: new Map(),
        flatInsufficientStock: [],
      };

      for (const item of productsToPlan) {
        const plan = await getProductionPlan(tx, item.productId, item.quantity);
        plan.flatRawMaterials.forEach((value, key) => {
          const current = consolidated.flatRawMaterials.get(key) || { product: value.product, quantity: 0 };
          consolidated.flatRawMaterials.set(key, { ...current, quantity: current.quantity + value.quantity });
        });
        plan.flatWorkItems.forEach((value, key) => {
          const current = consolidated.flatWorkItems.get(key) || { assemblyJob: value.assemblyJob, quantity: 0 };
          consolidated.flatWorkItems.set(key, { ...current, quantity: current.quantity + value.quantity });
        });
        consolidated.flatInsufficientStock.push(...plan.flatInsufficientStock);
      }

      if (consolidated.flatInsufficientStock.length > 0) {
        const errorItem = consolidated.flatInsufficientStock[0];
        throw new Error(`Stock insuficiente para ${errorItem.product.description}. Necesario: ${errorItem.required}, Disponible: ${errorItem.available}`);
      }

      // NEW VALIDATION: Check if all associated assembly works have a price
      for (const [, { assemblyJob }] of consolidated.flatWorkItems) {
        if (!assemblyJob.price || Number(assemblyJob.price) <= 0) {
          throw new Error(`El trabajo de armado '${assemblyJob.name}' no tiene un precio definido o es cero. Por favor, defina un precio en la gestión de trabajos de armado.`);
        }
      }
      // END NEW VALIDATION

      // --- Order Number Generation ---
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const sequence = await tx.orderSequence.upsert({
        where: { date: today },
        update: { lastSequence: { increment: 1 } },
        create: { date: today, lastSequence: 1 },
      });
      const year = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      const orderNumber = `OE-${year}${month}${day}-${String(sequence.lastSequence).padStart(4, '0')}`;

      const order = await tx.externalProductionOrder.create({
        data: {
          orderNumber, // Add the generated order number
          assembler: {
            connect: { id: assemblerId }
          },
          dateSent: new Date(),
          expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
          notes,
          status: 'PENDING_DELIVERY',
        },
      });

      // Create the expected production record for the main product
      await tx.expectedProduction.create({
        data: {
          externalProductionOrderId: order.id,
          productId: productId, // The main product ID
          quantityExpected: quantity, // The main product quantity
        },
      });

      const eventId = crypto.randomUUID();

      // 1. Save sent materials and create inventory movements
      for (const [, { product, quantity: requiredQty }] of consolidated.flatRawMaterials) {
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
            externalProductionOrderId: order.id,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: requiredQty } },
        });
      }

      // 2. Save the required assembly steps for the order
      for (const [, { assemblyJob, quantity: workQty }] of consolidated.flatWorkItems) {
        await tx.orderAssemblyStep.create({
          data: {
            externalProductionOrderId: order.id,
            assemblyJobId: assemblyJob.id,
            quantity: workQty,
            unitPrice: assemblyJob.price,
          },
        });
      }

      return order;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error in external order creation transaction (commit):", error.message);
    res.status(400).json({ error: error.message });
  }
});


// GET /api/external-production-orders - List all orders
router.get('/', authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { 
    status, 
    assemblerId, 
    dateFrom, 
    dateTo, 
    search, 
    page = 1, 
    pageSize = 25 
  } = req.query;

  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const skip = (pageNum - 1) * pageSizeNum;
  const take = pageSizeNum;

  try {
    const where = {};
    if (status) {
      where.status = { in: status.split(',') };
    }
    if (assemblerId) {
      where.assemblerId = assemblerId;
    }
    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { items: { some: { product: { description: { contains: search, mode: 'insensitive' } } } } },
        { items: { some: { product: { internalCode: { contains: search, mode: 'insensitive' } } } } },
        { expectedOutputs: { some: { product: { description: { contains: search, mode: 'insensitive' } } } } },
        { expectedOutputs: { some: { product: { internalCode: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const [orders, totalOrders] = await prisma.$transaction([
      prisma.externalProductionOrder.findMany({
        where,
        include: {
          assembler: true,
          deliveryUser: { select: { id: true, name: true } },
          pickupUser: { select: { id: true, name: true } },
          items: { include: { product: { select: { description: true, internalCode: true } } } },
          expectedOutputs: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.externalProductionOrder.count({ where }),
    ]);
    
    res.json({
      orders: orders,
      pagination: {
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / pageSizeNum),
        currentPage: pageNum,
        pageSize: pageSizeNum,
      },
    });

  } catch (error) {
    console.error("Error fetching external production orders:", error.message);
    res.status(500).json({ error: 'Failed to fetch external production orders.' });
  }
});

// GET /api/external-production-orders/:id - Get a single order by ID
router.get('/:id', authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.externalProductionOrder.findUnique({
      where: { id },
      include: {
        assembler: true,
        deliveryUser: { select: { id: true, name: true } },
        pickupUser: { select: { id: true, name: true } },
        items: { 
          include: { 
            product: { select: { description: true, internalCode: true, unit: true } } 
          } 
        },
        expectedOutputs: { 
          include: { 
            product: { select: { description: true, internalCode: true, unit: true } } 
          } 
        },
        orderNotes: {
          include: {
            author: { select: { name: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        assemblySteps: {
          include: {
            assemblyJob: true
          }
        }
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});


// PUT /api/external-production-orders/:id/assign - Assign a delivery person
router.put('/:id/assign', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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

// POST /api/external-production-orders/:id/cancel - Cancel an order
router.post('/:id/cancel', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
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

// POST /:id/confirm-delivery - Confirm material delivery to assembler
router.post(
  '/:id/confirm-delivery',
  authorizeAssignedUserOrAdmin(['ADMIN', 'SUPERVISOR'], 'deliveryUserId'),
  async (req, res) => {
    const { id } = req.params;
    const { order } = req; // Use the order from middleware

    try {
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ error: `No se puede confirmar la entrega para una orden con estado ${order.status}` });
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

// POST /:id/report-failure - Report a failed delivery
router.post(
  '/:id/report-failure',
  authorizeAssignedUserOrAdmin(['ADMIN', 'SUPERVISOR'], 'deliveryUserId'),
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const { order } = req; // Use the order from middleware

    try {
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ error: `No se puede reportar una falla para una orden con estado ${order.status}` });
      }

      const updatedOrder = await prisma.externalProductionOrder.update({
        where: { id },
        data: {
          status: 'DELIVERY_FAILED',
        },
      });

      if (notes) {
        await prisma.orderNote.create({
          data: {
            content: notes,
            authorId: req.user.userId,
            externalProductionOrderId: id,
          },
        });
      }

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
      return res.status(400).json({ error: `No se puede confirmar el armado para una orden con estado ${order.status}` });
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
    return res.status(400).json({ error: 'userId es requerido.' });
  }

  try {
    const order = await prisma.externalProductionOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['PENDING_PICKUP', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      return res.status(400).json({ error: `No se puede asignar el retiro para una orden con estado ${order.status}` });
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
    const { receivedItems, justified, notes, isFinalDelivery } = req.body; // receivedItems is an array of { productId, quantity: quantityInThisDelivery }
    const userId = req.user.userId;

    if (!receivedItems || !Array.isArray(receivedItems)) {
      return res.status(400).json({ error: 'receivedItems debe ser un array.' });
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

        if (!['RETURN_IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(order.status)) {
          throw new Error(`No se pueden recibir ítems para una orden con estado ${order.status}`);
        }

        const eventId = crypto.randomUUID();
        
        // Validate quantities before making any changes
        for (const receivedItem of receivedItems) {
          const expectedItem = order.expectedOutputs.find(e => e.productId === receivedItem.productId);
          if (!expectedItem) {
            throw new Error(`Producto inesperado recibido: ID ${receivedItem.productId}`);
          }

          const pendingQuantity = Number(expectedItem.quantityExpected) - Number(expectedItem.quantityReceived);
          if (Number(receivedItem.quantity) > pendingQuantity) {
            throw new Error(`La cantidad recibida (${receivedItem.quantity}) para el producto ${expectedItem.productId} es mayor a la cantidad pendiente (${pendingQuantity}).`);
          }
        }

        // Process valid receptions
        for (const receivedItem of receivedItems) {
          const quantityInThisDelivery = Number(receivedItem.quantity);
          if (quantityInThisDelivery <= 0) continue;

          try {
            // 1. Update stock
            await tx.product.update({
              where: { id: receivedItem.productId },
              data: { stock: { increment: quantityInThisDelivery } },
            });

            // 2. Create inventory movement
            await tx.inventoryMovement.create({
              data: {
                productId: receivedItem.productId,
                type: 'RECEIVED_FROM_ASSEMBLER',
                quantity: quantityInThisDelivery,
                userId: userId,
                notes: `Recepción parcial/total de orden externa #${order.id}`,
                eventId: eventId,
                externalProductionOrderId: order.id,
              },
            });

            // 3. Update the quantityReceived on the ExpectedProduction record
            await tx.expectedProduction.update({
              where: { id: order.expectedOutputs.find(e => e.productId === receivedItem.productId).id },
              data: { quantityReceived: { increment: quantityInThisDelivery } },
            });
          } catch (e) {
            console.error(`--- DEBUG: ERROR processing item ${receivedItem.productId} ---`);
            console.error(e);
            throw new Error(`Falló el procesamiento para el producto ${receivedItem.productId}.`);
          }
        }

        // Check if the order is fully completed
        const updatedExpectedOutputs = await tx.expectedProduction.findMany({ where: { externalProductionOrderId: order.id } });
        const isNumericallyComplete = updatedExpectedOutputs.every(e => Number(e.quantityReceived) >= Number(e.quantityExpected));

        let finalStatus = order.status;

        if (isFinalDelivery) {
          // User intends to close the order, regardless of numeric completion.
          const hasDiscrepancy = updatedExpectedOutputs.some(e => String(e.quantityReceived) !== String(e.quantityExpected));
          if (hasDiscrepancy) {
            finalStatus = justified ? 'COMPLETED_WITH_NOTES' : 'COMPLETED_WITH_DISCREPANCY';
          } else {
            finalStatus = 'COMPLETED';
          }
        } else {
          // This is explicitly a partial delivery, so only check for numeric completion.
          if (isNumericallyComplete) {
            finalStatus = 'COMPLETED';
          } else {
            finalStatus = 'PARTIALLY_RECEIVED';
          }
        }

        if (notes) {
          await tx.orderNote.create({
            data: {
              content: notes,
              authorId: userId,
              externalProductionOrderId: id,
            },
          });
        }

        const updatedOrder = await tx.externalProductionOrder.update({
          where: { id },
          data: { status: finalStatus },
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