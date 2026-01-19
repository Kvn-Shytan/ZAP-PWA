const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// === SPECIFIC ROUTES FIRST ===

// Get all assemblers
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined
    : { id: true, name: true, phone: true, address: true };

  try {
    const assemblersFromDb = await prisma.assembler.findMany({
      select: selectFields,
      orderBy: { name: 'asc' },
    });
    // The selectFields already ensures that only allowed fields are returned
    res.json(assemblersFromDb);
  } catch (error) {
    console.error('Error fetching assemblers:', error);
    res.status(500).json({ error: 'Failed to fetch assemblers.' });
  }
});

// Create a new assembler
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
    if (!name || !paymentTerms) {
      return res.status(400).json({ error: 'Name and paymentTerms are required' });
    }
    const newAssembler = await prisma.assembler.create({
      data: { name, contactInfo, address, phone, email, paymentTerms },
    });
    res.status(201).json(newAssembler);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembler with this name already exists.' });
    }
    console.error('Error creating assembler:', error);
    res.status(500).json({ error: 'Failed to create assembler.' });
  }
});

// GET /api/assemblers/payment-summary-batch - Get payment summary for multiple assemblers
router.get('/payment-summary-batch', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required.' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Ensure endDate includes the entire day

    const allAssemblers = await prisma.assembler.findMany({
      orderBy: { name: 'asc' },
    });

    const batchPaymentSummary = [];

    for (const assembler of allAssemblers) {
      const orders = await prisma.externalProductionOrder.findMany({
        where: {
          assemblerId: assembler.id,
          createdAt: {
            gte: start,
            lte: end,
          },
          status: {
            in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'],
          },
          assemblerPaymentId: null, // Only fetch unpaid orders
        },
        include: {
          assemblySteps: {
            include: {
              assemblyJob: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      let assemblerTotalPayment = 0;
      const assemblerPaymentDetails = [];

      for (const order of orders) {
        let orderTotal = 0;
        for (const step of order.assemblySteps) {
          const itemPayment = Number(step.quantity) * Number(step.unitPrice);
          orderTotal += itemPayment;

          assemblerPaymentDetails.push({
            orderNumber: order.orderNumber,
            productId: step.assemblyJob.id,
            productDescription: step.assemblyJob.name,
            assemblyJobName: step.assemblyJob.name,
            assemblyJobPrice: Number(step.unitPrice),
            quantityToPayFor: Number(step.quantity),
            itemPayment: itemPayment,
            orderStatus: order.status,
          });
        }
        assemblerTotalPayment += orderTotal;
      }

      batchPaymentSummary.push({
        assemblerId: assembler.id,
        assemblerName: assembler.name,
        paymentTerms: assembler.paymentTerms,
        pendingPayment: assemblerTotalPayment,
        totalJobs: assemblerPaymentDetails.length,
        paymentDetails: assemblerPaymentDetails,
      });
    }

    res.json({
      startDate: startDate,
      endDate: endDate,
      summary: batchPaymentSummary,
    });

  } catch (error) {
    console.error(`Error calculating batch payment summary:`, error);
    res.status(500).json({ error: 'Failed to calculate batch payment summary.' });
  }
});

// POST /api/assemblers/close-fortnight-batch - Close the fortnight and register payments
router.post('/close-fortnight-batch', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  const { assemblerIds, startDate, endDate } = req.body;

  if (!assemblerIds || !Array.isArray(assemblerIds) || assemblerIds.length === 0 || !startDate || !endDate) {
    return res.status(400).json({ error: 'assemblerIds (array), startDate, and endDate are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const processedPayments = [];

      for (const assemblerId of assemblerIds) {
        const orders = await tx.externalProductionOrder.findMany({
          where: {
            assemblerId: assemblerId,
            createdAt: {
              gte: start,
              lte: end,
            },
            status: {
              in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'],
            },
            assemblerPaymentId: null,
          },
          include: {
            assemblySteps: true
          },
        });

        let totalPaymentForAssembler = 0;
        const paidOrderIds = [];

        for (const order of orders) {
          for(const step of order.assemblySteps) {
            totalPaymentForAssembler += Number(step.quantity) * Number(step.unitPrice);
          }
          paidOrderIds.push(order.id);
        }

        if (totalPaymentForAssembler > 0) {
          const assembler = await tx.assembler.findUnique({ where: { id: assemblerId } });
          const newPayment = await tx.assemblerPayment.create({
            data: {
              assemblerId: assemblerId,
              datePaid: new Date(),
              amount: totalPaymentForAssembler,
              periodStart: start,
              periodEnd: end,
              notes: `Liquidación de quincena para ${assembler?.name} (${startDate} - ${endDate})`,
            },
          });

          await tx.externalProductionOrder.updateMany({
            where: { id: { in: paidOrderIds } },
            data: { assemblerPaymentId: newPayment.id },
          });

          processedPayments.push({
            assemblerId: assemblerId,
            assemblerName: assembler?.name,
            totalPayment: totalPaymentForAssembler,
            paymentId: newPayment.id,
          });
        }
      }
      return processedPayments;
    });

    res.status(200).json(result);

  } catch (error) {
    console.error(`Error closing fortnight batch:`, error);
    res.status(500).json({ error: 'Failed to close fortnight batch.' });
  }
});

// GET /api/assemblers/payments - Get payment history for assemblers
router.get('/payments', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { assemblerId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // 1. Define the main 'where' clause for AssemblerPayment
    const paymentWhere = {};
    if (assemblerId) {
      paymentWhere.assemblerId = assemblerId;
    }
    if (startDate) {
      // Ensure we query from the start of the day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      paymentWhere.datePaid = { ...paymentWhere.datePaid, gte: start };
    }
    if (endDate) {
      // Ensure we query until the end of the day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      paymentWhere.datePaid = { ...paymentWhere.datePaid, lte: end };
    }

    // 2. Execute all database queries concurrently for maximum efficiency
    const [
      payments,
      totalPayments,
      totalPaidAggregate,
    ] = await prisma.$transaction([
      prisma.assemblerPayment.findMany({
        where: paymentWhere,
        include: { 
          assembler: { select: { id: true, name: true } }, 
          orders: { select: { id: true, orderNumber: true, status: true } } 
        },
        orderBy: { datePaid: 'desc' },
        skip,
        take: parsedLimit,
      }),
      prisma.assemblerPayment.count({ where: paymentWhere }),
      prisma.assemblerPayment.aggregate({
        _sum: { amount: true },
        where: paymentWhere,
      }),
    ]);
    
    // 3. Construct the final response
    res.json({
      data: payments,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalPayments / parsedLimit),
      totalCount: totalPayments,
      aggregates: {
        totalPaid: totalPaidAggregate._sum.amount || 0,
      }
    });

  } catch (error) {
    console.error(`Error fetching assembler payments:`, error);
    res.status(500).json({ error: 'Failed to fetch assembler payments.' });
  }
});

// === GENERIC / PARAMETERIZED ROUTES LAST ===

// Get an assembler by ID
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined
    : { id: true, name: true, phone: true, address: true };

  try {
    const assembler = await prisma.assembler.findUnique({
      where: { id },
      select: selectFields,
    });
    if (assembler) {
      res.json(assembler);
    } else {
      res.status(404).json({ error: 'Assembler not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assembler.' });
  }
});

// GET /api/assemblers/:assemblerId/payment-summary - Get payment summary for a single assembler
router.get('/:assemblerId/payment-summary', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { assemblerId } = req.params;
  const { startDate, endDate } = req.query;

  if (!assemblerId || !startDate || !endDate) {
    return res.status(400).json({ error: 'assemblerId, startDate, and endDate are required.' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.externalProductionOrder.findMany({
      where: {
        assemblerId: assemblerId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'],
        },
      },
      include: {
        assemblySteps: { include: { assemblyJob: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalPayment = 0;
    const paymentDetails = [];

    for (const order of orders) {
      for (const step of order.assemblySteps) {
        const itemPayment = Number(step.quantity) * Number(step.unitPrice);
        totalPayment += itemPayment;
        paymentDetails.push({
          orderNumber: order.orderNumber,
          productId: step.assemblyJob.id,
          productDescription: step.assemblyJob.name,
          assemblyJobName: step.assemblyJob.name,
          assemblyJobPrice: Number(step.unitPrice),
          quantityExpected: Number(step.quantity),
          quantityReceived: Number(step.quantity), // Assumption: for payment, received = expected
          quantityToPayFor: Number(step.quantity),
          itemPayment: itemPayment,
          orderStatus: order.status,
          notes: order.notes,
        });
      }
    }

    res.json({
      assemblerId: assemblerId,
      startDate: startDate,
      endDate: endDate,
      totalPayment: totalPayment,
      paymentDetails: paymentDetails,
    });

  } catch (error) {
    console.error(`Error calculating payment summary for assembler ${assemblerId}:`, error);
    res.status(500).json({ error: 'Failed to calculate payment summary.' });
  }
});

// Update an assembler by ID
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
  try {
    const updatedAssembler = await prisma.assembler.update({
      where: { id },
      data: { name, contactInfo, address, phone, email, paymentTerms },
    });
    res.json(updatedAssembler);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembler not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembler with this name already exists.' });
    }
    console.error('Error updating assembler:', error);
    res.status(500).json({ error: 'Failed to update assembler.' });
  }
});

// Delete an assembler by ID
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.assembler.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembler not found' });
    }
    console.error('Error deleting assembler:', error);
    res.status(500).json({ error: 'Failed to delete assembler.' });
  }
});

module.exports = router;