const express = require('express');
const { authenticateToken, authorizeRole } = require('../authMiddleware');

const prisma = require('../prisma/client');
const router = express.Router();

// === SPECIFIC ROUTES FIRST ===

// Obtener todos los armadores
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined
    : { id: true, name: true, phone: true, address: true };

  try {
    const assemblers = await prisma.armador.findMany({
      select: selectFields,
      orderBy: { name: 'asc' },
    });
    res.json(assemblers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch assemblers.' });
  }
});

// Crear un nuevo armador
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  try {
    const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
    if (!name || !paymentTerms) {
      return res.status(400).json({ error: 'Name and paymentTerms are required' });
    }
    const newAssembler = await prisma.armador.create({
      data: { name, contactInfo, address, phone, email, paymentTerms },
    });
    res.status(201).json(newAssembler);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'An assembler with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create assembler.' });
  }
});

// GET /api/assemblers/payment-summary-batch - Obtener resumen de pagos para múltiples armadores
router.get('/payment-summary-batch', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required.' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Ensure endDate includes the entire day

    const allArmadores = await prisma.armador.findMany({
      orderBy: { name: 'asc' },
    });

    const batchPaymentSummary = [];

    for (const armador of allArmadores) {
      console.log('Processing armador:', armador);
      const orders = await prisma.externalProductionOrder.findMany({
        where: {
          armadorId: armador.id,
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
          expectedOutputs: {
            include: {
              product: true,
            },
          },
          assemblySteps: {
            include: {
              trabajoDeArmado: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      console.log(`Found ${orders.length} orders for armador ${armador.name}`);

      let armadorTotalPayment = 0;
      const armadorPaymentDetails = [];

      for (const order of orders) {
        let orderTotal = 0;
        for (const step of order.assemblySteps) {
          const itemPayment = Number(step.quantity) * Number(step.precioUnitario);
          orderTotal += itemPayment;

          armadorPaymentDetails.push({
            orderNumber: order.orderNumber,
            productId: step.trabajoDeArmado.id,
            productDescription: step.trabajoDeArmado.nombre,
            trabajoDeArmado: step.trabajoDeArmado.nombre,
            trabajoPrecio: Number(step.precioUnitario),
            quantityToPayFor: Number(step.quantity),
            itemPayment: itemPayment,
            orderStatus: order.status,
          });
        }
        armadorTotalPayment += orderTotal;
      }
      console.log(`Total payment for armador ${armador.name}: ${armadorTotalPayment}`);

        batchPaymentSummary.push({
          assemblerId: armador.id,
          assemblerName: armador.name,
          paymentTerms: armador.paymentTerms,
          pendingPayment: armadorTotalPayment,
          totalJobs: armadorPaymentDetails.length,
          totalPaid: 0,
          paymentDetails: armadorPaymentDetails,
        });
    }

    console.log('Final batch summary:', JSON.stringify(batchPaymentSummary, null, 2));

    res.json({
      startDate: startDate,
      endDate: endDate,
      summary: batchPaymentSummary,
    });

  } catch (error) {
    console.error(`Error calculating batch payment summary:`, error.message);
    res.status(500).json({ error: 'Failed to calculate batch payment summary.' });
  }
});

// POST /api/assemblers/close-fortnight-batch - Cierra la quincena y registra pagos
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
            armadorId: assemblerId, // Database field remains 'armadorId'
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
            expectedOutputs: { include: { product: true } },
            assemblySteps: { include: { trabajoDeArmado: true } },
          },
        });

        let totalPaymentForAssembler = 0;
        const paidOrderIds = [];

        for (const order of orders) {
          let orderTotal = 0;
          for (const expectedOutput of order.expectedOutputs) {
            const productoTrabajoArmado = await tx.productoTrabajoArmado.findFirst({
              where: { productId: expectedOutput.productId },
              include: { trabajo: true },
            });

            if (productoTrabajoArmado && productoTrabajoArmado.trabajo) {
              const trabajoPrecio = Number(productoTrabajoArmado.trabajo.precio);
              let quantityToPayFor = 0;

              if (order.status === 'COMPLETED' || order.status === 'COMPLETED_WITH_NOTES') {
                quantityToPayFor = Number(expectedOutput.quantityExpected);
              } else if (order.status === 'COMPLETED_WITH_DISCREPANCY') {
                quantityToPayFor = Number(expectedOutput.quantityReceived);
              }

              orderTotal += quantityToPayFor * trabajoPrecio;
            }
          }
          totalPaymentForAssembler += orderTotal;
          paidOrderIds.push(order.id);
        }

        if (totalPaymentForAssembler > 0) {
          const newPayment = await tx.assemblerPayment.create({
            data: {
              armadorId: assemblerId, // Database field remains 'armadorId'
              datePaid: new Date(),
              amount: totalPaymentForAssembler,
              periodStart: start,
              periodEnd: end,
              notes: `Liquidación de quincena para ${(await tx.armador.findUnique({ where: { id: assemblerId } }))?.name} (${startDate} - ${endDate})`,
            },
          });

          await tx.externalProductionOrder.updateMany({
            where: { id: { in: paidOrderIds } },
            data: { assemblerPaymentId: newPayment.id },
          });

          processedPayments.push({
            assemblerId: assemblerId,
            assemblerName: (await tx.armador.findUnique({ where: { id: assemblerId } }))?.name,
            totalPayment: totalPaymentForAssembler,
            paymentId: newPayment.id,
          });
        }
      }
      return processedPayments;
    });

    res.status(200).json(result);

  } catch (error) {
    console.error(`Error closing fortnight batch:`, error.message);
    res.status(500).json({ error: 'Failed to close fortnight batch.' });
  }
});

// GET /api/assemblers/payments - Obtener historial de pagos a armadores
router.get('/payments', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { assemblerId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // 1. Define the main 'where' clause for AssemblerPayment
    const paymentWhere = {};
    if (assemblerId) {
      paymentWhere.armadorId = assemblerId;
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

    // 2. Define the 'where' clause for related ExpectedProduction by traversing the relation backwards
    const unitsWhere = {
      order: {
        assemblerPayment: paymentWhere
      }
    };

    // 3. Execute all database queries concurrently for maximum efficiency
    const [
      payments,
      totalPayments,
      totalPaidAggregate,
      totalUnitsAggregate
    ] = await prisma.$transaction([
      prisma.assemblerPayment.findMany({
        where: paymentWhere,
        include: { 
          armador: { select: { id: true, name: true } }, 
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
      prisma.expectedProduction.aggregate({
        _sum: { quantityReceived: true },
        where: unitsWhere,
      })
    ]);
    
    // 4. Construct the final response
    res.json({
      data: payments,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalPayments / parsedLimit),
      totalCount: totalPayments,
      aggregates: {
        totalPaid: totalPaidAggregate._sum.amount || 0,
        totalUnitsProduced: totalUnitsAggregate._sum.quantityReceived || 0,
      }
    });

  } catch (error) {
    console.error(`Error fetching assembler payments:`, error.message);
    res.status(500).json({ error: 'Failed to fetch assembler payments.' });
  }
});

// === GENERIC / PARAMETERIZED ROUTES LAST ===

// Obtener un armador por ID
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR', 'EMPLOYEE']), async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  const selectFields = (role === 'ADMIN' || role === 'SUPERVISOR')
    ? undefined
    : { id: true, name: true, phone: true, address: true };

  try {
    const assembler = await prisma.armador.findUnique({
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

// GET /api/assemblers/:armadorId/payment-summary - Obtener resumen de pagos para un armador
router.get('/:armadorId/payment-summary', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { armadorId } = req.params;
  const { startDate, endDate } = req.query;

  if (!armadorId || !startDate || !endDate) {
    return res.status(400).json({ error: 'armadorId, startDate, and endDate are required.' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.externalProductionOrder.findMany({
      where: {
        armadorId: armadorId,
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ['COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY'],
        },
      },
      include: {
        expectedOutputs: { include: { product: true } },
        assemblySteps: { include: { trabajoDeArmado: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalPayment = 0;
    const paymentDetails = [];

    for (const order of orders) {
      let orderTotal = 0;
      const orderItems = [];

      for (const expectedOutput of order.expectedOutputs) {
        const productoTrabajoArmado = await prisma.productoTrabajoArmado.findFirst({
          where: { productId: expectedOutput.productId },
          include: { trabajo: true },
        });

        if (productoTrabajoArmado && productoTrabajoArmado.trabajo) {
          const trabajoPrecio = Number(productoTrabajoArmado.trabajo.precio);
          let quantityToPayFor = 0;

          if (order.status === 'COMPLETED' || order.status === 'COMPLETED_WITH_NOTES') {
            quantityToPayFor = Number(expectedOutput.quantityExpected);
          } else if (order.status === 'COMPLETED_WITH_DISCREPANCY') {
            quantityToPayFor = Number(expectedOutput.quantityReceived);
          }

          const itemPayment = quantityToPayFor * trabajoPrecio;
          orderTotal += itemPayment;
          paymentDetails.push({
            orderNumber: order.orderNumber,
            productId: expectedOutput.productId,
            productDescription: expectedOutput.product.description,
            trabajoDeArmado: productoTrabajoArmado.trabajo.nombre,
            trabajoPrecio: trabajoPrecio,
            quantityExpected: Number(expectedOutput.quantityExpected),
            quantityReceived: Number(expectedOutput.quantityReceived),
            quantityToPayFor: quantityToPayFor,
            itemPayment: itemPayment,
            orderStatus: order.status,
            notes: order.notes,
          });
        }
      }
      totalPayment += orderTotal;
    }

    res.json({
      armadorId: armadorId,
      startDate: startDate,
      endDate: endDate,
      totalPayment: totalPayment,
      paymentDetails: paymentDetails,
    });

  } catch (error) {
    console.error(`Error calculating payment summary for armador ${armadorId}:`, error.message);
    res.status(500).json({ error: 'Failed to calculate payment summary.' });
  }
});

// Actualizar un armador por ID
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'SUPERVISOR']), async (req, res) => {
  const { id } = req.params;
  const { name, contactInfo, address, phone, email, paymentTerms } = req.body;
  try {
    const updatedAssembler = await prisma.armador.update({
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
    console.error(error);
    res.status(500).json({ error: 'Failed to update assembler.' });
  }
});

// Eliminar un armador por ID
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.armador.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Assembler not found' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete assembler.' });
  }
});

module.exports = router;
