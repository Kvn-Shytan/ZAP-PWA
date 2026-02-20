const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma/client');
const authMiddleware = require('../authMiddleware'); // Import full module
const crypto = require('crypto'); // For eventId if needed

const router = express.Router();

// --- Zod Schemas for Validation ---
const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "El ID del producto es requerido."),
  quantity: z.number().min(0.01, "La cantidad debe ser un número positivo."),
  unitPrice: z.number().min(0, "El precio unitario debe ser no negativo."),
});

const createSalesOrderSchema = z.object({
  clientId: z.string().min(1, "El ID del cliente es requerido."),
  salesPlatform: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentStatus: z.enum(['PENDING', 'CREDITED', 'PAID_PARTIAL']).default('PENDING'),
  items: z.array(salesOrderItemSchema).min(1, "La orden de venta debe contener al menos un item."),
});

// Helper function for validation
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ errors: error.issues });
  }
};

router.use(authMiddleware.authenticateToken); // Use authMiddleware.authenticateToken

// POST /api/sales - Create a new SalesOrder
router.post('/', authMiddleware.authorizeRole(['ADMIN', 'SUPERVISOR']), validate(createSalesOrderSchema), async (req, res) => {
  const { clientId, salesPlatform, notes, paymentStatus, items } = req.body;
  const userId = req.user.userId; // User creating the sales order

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalOrderAmount = 0;
      const productStockUpdates = []; // To accumulate stock changes

      // 1. Validate stock and calculate total amount
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado.`);
        }
        if (product.type !== 'FINISHED' && product.type !== 'PRE_ASSEMBLED') {
          throw new Error(`Solo se pueden vender productos de tipo FINISHED o PRE_ASSEMBLED. Producto: ${product.description}`);
        }
        
        // Eliminado el bloqueo por stock insuficiente para permitir ventas con stock negativo.
        // El frontend ya advierte al usuario, pero el sistema ahora permite proceder.
        
        const itemTotalPrice = item.quantity * item.unitPrice;
        totalOrderAmount += itemTotalPrice;

        productStockUpdates.push({ productId: item.productId, quantity: item.quantity });
      }

      // 2. Generate a unique Sales Order Number (e.g., SO-YYYYMMDD-XXXX)
      const year = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      const today = `${new Date().getFullYear()}-${month}-${day}`; // ISO format for sequence table

      let salesOrderNumber = '';
      let isUnique = false;
      let currentSequence = 0;

      // Increment sequence in the table
      const sequence = await tx.orderSequence.upsert({
        where: { date: today },
        update: { lastSequence: { increment: 1 } },
        create: { date: today, lastSequence: 1 },
      });
      currentSequence = sequence.lastSequence;

      // Loop to ensure uniqueness (safety net for race conditions or manual deletions)
      while (!isUnique) {
        salesOrderNumber = `SO-${year}${month}${day}-${String(currentSequence).padStart(4, '0')}`;
        const existingOrder = await tx.salesOrder.findUnique({ where: { orderNumber: salesOrderNumber } });
        if (!existingOrder) {
          isUnique = true;
        } else {
          currentSequence++; // Try next number
          // Update the table to reflect the jump if we had to skip
          await tx.orderSequence.update({
            where: { date: today },
            data: { lastSequence: currentSequence }
          });
        }
      }


      // 3. Create SalesOrder
      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber: salesOrderNumber,
          client: { connect: { id: clientId } },
          salesPlatform,
          notes,
          paymentStatus,
          totalAmount: totalOrderAmount,
        },
      });

      // 4. Create SalesOrderItems and InventoryMovement
      const inventoryMovementsData = [];
      for (const item of items) {
        // Create SalesOrderItem
        await tx.salesOrderItem.create({
          data: {
            salesOrderId: salesOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          },
        });

        // Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Prepare InventoryMovement for SALE
        inventoryMovementsData.push({
          productId: item.productId,
          type: 'SALE',
          quantity: item.quantity,
          userId: userId,
          notes: notes || `Venta de ${item.quantity} unidades de ${item.productId}`, // Refine notes
          salesOrderId: salesOrder.id, // Link to sales order
        });
      }

      // Fetch client name for cleaner notes
      const client = await tx.client.findUnique({ where: { id: clientId }, select: { name: true } });

      const totalQuantitySold = items.reduce((sum, item) => sum + item.quantity, 0);
      const mainSaleMovement = await tx.inventoryMovement.create({
        data: {
          productId: items[0].productId, 
          type: 'SALE',
          quantity: totalQuantitySold,
          userId: userId,
          notes: `Venta #${salesOrder.orderNumber} al cliente ${client?.name || clientId}` + (notes ? `: ${notes}` : ''),
          salesOrderId: salesOrder.id,
        }
      });

      return salesOrder;
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Error creating sales order:", error);
    res.status(400).json({ error: error.message }); // Return specific error message
  }
});

// GET /api/sales/:id - Get a sales order by ID
router.get('/:id', authMiddleware.authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;
  try {
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: { internalCode: true, description: true, unit: true }
            }
          }
        }
      }
    });

    if (!salesOrder) {
      return res.status(404).json({ error: 'Sales order not found.' });
    }

    res.json(salesOrder);
  } catch (error) {
    console.error(`Error fetching sales order ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch sales order.' });
  }
});


module.exports = router;
