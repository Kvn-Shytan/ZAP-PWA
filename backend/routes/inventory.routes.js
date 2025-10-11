const express = require('express');
const prisma = require('../prisma/client');
const crypto = require('crypto');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const router = express.Router();

// Middleware para proteger todas las rutas de este archivo
router.use(authenticateToken);

// Registrar una Orden de Producción
router.post('/production', authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const eventId = crypto.randomUUID(); // Generate a unique ID for this event

    // Iniciar una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Encontrar los componentes del producto (su "receta")
      const components = await tx.productComponent.findMany({
        where: { productId: productId },
        include: { component: true }, // Incluir datos del componente para verificar stock
      });

      if (components.length === 0) {
        throw new Error('Este producto no tiene componentes definidos y no puede ser producido de esta forma.');
      }

      // 2. Verificar si hay suficiente stock de CADA componente
      for (const item of components) {
        const requiredStock = item.quantity * quantity;
        if (item.component.stock < requiredStock) {
          throw new Error(`Stock insuficiente para el componente: ${item.component.description}. Necesario: ${requiredStock}, Disponible: ${item.component.stock}`);
        }
      }

      // 3. Crear el movimiento de entrada para el producto fabricado (PRODUCTION_IN)
      const productionIn = await tx.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PRODUCTION_IN',
          quantity: quantity,
          userId: userId,
          notes: `Producción de ${quantity} unidades.`,
          eventId: eventId, // Assign event ID
        }
      });

      // 4. Actualizar el stock del producto fabricado
      const finalProductUpdate = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      // 5. Crear los movimientos de salida para cada componente (PRODUCTION_OUT)
      const componentMovements = [];
      for (const item of components) {
        const requiredStock = item.quantity * quantity;

        const productionOut = await tx.inventoryMovement.create({
          data: {
            productId: item.componentId,
            type: 'PRODUCTION_OUT',
            quantity: requiredStock,
            userId: userId,
            notes: `Uso para producción de ${quantity} x ${finalProductUpdate.description}`,
            eventId: eventId, // Assign the same event ID
          }
        });
        componentMovements.push(productionOut);

        await tx.product.update({
          where: { id: item.componentId },
          data: { stock: { decrement: requiredStock } },
        });
      }
      
      return { productionIn, componentMovements };
    });

    res.status(201).json(result);

  } catch (error) {
    // Si el error es por stock insuficiente o cualquier otra cosa, la transacción hará rollback
    console.error("Error en la transacción de producción:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Compra
router.post('/purchase', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Opcional: Verificar que el producto es de tipo RAW_MATERIAL
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      if (product.type !== 'RAW_MATERIAL') {
        // O se podría permitir comprar cualquier cosa, a definir.
        throw new Error('Solo se pueden registrar compras de productos tipo RAW_MATERIAL.');
      }

      // Crear el movimiento de entrada
      const purchaseMovement = await prisma.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'PURCHASE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Compra de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });

      return purchaseMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de compra:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Registrar una Venta
router.post('/sale', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { productId, quantity, notes } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Producto no encontrado.');
      }
      // Opcional: verificar que sea un producto FINISHED
      if (product.type !== 'FINISHED') {
        throw new Error('Solo se pueden vender productos de tipo FINISHED.');
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${product.stock}, Requerido: ${quantity}`);
      }

      // Crear el movimiento de salida
      const saleMovement = await prisma.inventoryMovement.create({
        data: {
          productId: productId,
          type: 'SALE',
          quantity: quantity,
          userId: userId,
          notes: notes || `Venta de ${quantity} unidades.`
        }
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return saleMovement;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la transacción de venta:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Anular un Movimiento de Inventario (Contra-asiento)
router.post('/reversal', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { movementId } = req.body;
  const userPerformingReversalId = req.user.userId;

  if (!movementId) {
    return res.status(400).json({ error: 'movementId is required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const originalMovement = await tx.inventoryMovement.findUnique({ where: { id: movementId } });

      if (!originalMovement) throw new Error('Movimiento original no encontrado.');
      if (originalMovement.notes?.startsWith('Anulación')) throw new Error('No se puede anular un movimiento que ya es una anulación.');

      let movementsToReverse = [];

      if (originalMovement.eventId) {
        // Si tiene un eventId, buscar todos los movimientos del evento
        const eventMovements = await tx.inventoryMovement.findMany({ where: { eventId: originalMovement.eventId } });
        // Verificar que ninguno haya sido anulado ya
        for (const mov of eventMovements) {
            const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${mov.id}` } });
            if (existingReversal) throw new Error(`El evento #${originalMovement.eventId} ya ha sido anulado (movimiento #${mov.id} ya fue revertido).`);
        }
        movementsToReverse = eventMovements;
      } else {
        // Si no, solo anular el movimiento individual
        const existingReversal = await tx.inventoryMovement.findFirst({ where: { notes: `Anulación del mov. #${movementId}` } });
        if (existingReversal) throw new Error('Este movimiento ya ha sido anulado previamente.');
        movementsToReverse.push(originalMovement);
      }

      const reversalMovements = [];
      for (const mov of movementsToReverse) {
        let reversalType;
        let stockChange;
        const isIncome = ['PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN'].includes(mov.type);

        if (isIncome) {
          reversalType = 'ADJUSTMENT_OUT';
          stockChange = { decrement: mov.quantity };
        } else {
          reversalType = 'ADJUSTMENT_IN';
          stockChange = { increment: mov.quantity };
        }

        const reversal = await tx.inventoryMovement.create({
          data: {
            productId: mov.productId,
            type: reversalType,
            quantity: mov.quantity,
            userId: userPerformingReversalId,
            notes: `Anulación del mov. #${mov.id}`,
          },
        });
        reversalMovements.push(reversal);

        await tx.product.update({
          where: { id: mov.productId },
          data: { stock: { decrement: mov.quantity } },
        });
      }

      return reversalMovements;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error en la anulación de movimiento:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// Obtener productos con bajo stock
router.get('/low-stock', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        // Usamos `expr` para poder comparar dos campos del mismo modelo
        stock: {
          lt: prisma.product.fields.lowStockThreshold,
        },
        // Opcional: filtrar para que solo muestre productos que tienen un umbral definido > 0
        lowStockThreshold: {
          gt: 0,
        },
      },
      orderBy: { description: 'asc' },
    });
    res.json(lowStockProducts);
  } catch (error) {
    console.error("Error al obtener productos con bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to fetch low stock products.' });
  }
});

// Actualizar el umbral de bajo stock para un producto
router.put('/low-stock-threshold', authorizeRole('ADMIN'), async (req, res) => {
  const { productId, newThreshold } = req.body;

  if (!productId || newThreshold === undefined || newThreshold < 0) {
    return res.status(400).json({ error: 'productId and a non-negative newThreshold are required.' });
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { lowStockThreshold: newThreshold },
    });
    res.json(updatedProduct);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found.' });
    }
    console.error("Error al actualizar el umbral de bajo stock:", error.message);
    res.status(500).json({ error: 'Failed to update low stock threshold.' });
  }
});

// Obtener historial de movimientos con filtros y paginación
router.get('/movements', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { page = 1, pageSize = 20, productId, userId, type, startDate, endDate, isCorrection } = req.query;

  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);

  const where = {};

  if (productId) {
    where.productId = productId;
  }
  if (userId) {
    where.userId = parseInt(userId);
  }
  if (type) {
    where.type = type;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (isCorrection === 'true') {
    where.OR = [
      { type: 'ADJUSTMENT_IN' },
      { type: 'ADJUSTMENT_OUT' },
      { type: 'WASTAGE' },
    ];
  }

  try {
    const movements = await prisma.inventoryMovement.findMany({
      where,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: {
          select: { description: true, internalCode: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const totalMovements = await prisma.inventoryMovement.count({ where });

    res.json({
      movements,
      totalMovements,
      currentPage: pageNum,
      totalPages: Math.ceil(totalMovements / pageSizeNum),
    });

  } catch (error) {
    console.error("Error al obtener historial de movimientos:", error.message);
    res.status(500).json({ error: 'Failed to fetch inventory movements.' });
  }
});

// NUEVO ENDPOINT: Obtener productos no clasificados
router.get('/products/unclassified', authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  console.log('[/api/products/unclassified] Request received.');
  try {
    const unclassifiedProducts = await prisma.product.findMany({
      where: { isClassified: false },
      select: {
        id: true,
        internalCode: true,
        description: true,
        type: true, // Para mostrar el tipo actual
      },
      orderBy: { description: 'asc' },
    });
    console.log(`[/api/products/unclassified] Found ${unclassifiedProducts.length} unclassified products.`);
    res.json(unclassifiedProducts);
  } catch (error) {
    console.error("[/api/products/unclassified] Error al obtener productos no clasificados:", error.message);
    res.status(500).json({ error: 'Failed to fetch unclassified products.' });
  }
});

module.exports = router;
