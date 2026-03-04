const request = require('supertest');
const express = require('express');
const inventoryRouter = require('./inventory.routes');
const assemblersRouter = require('./assemblers.routes');
const prisma = require('../prisma/client');

const app = express();
app.use(express.json());

// Mock de authenticateToken y authorizeRole
jest.mock('../authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { userId: 1, role: 'ADMIN' }; // Mock de usuario ADMIN
    next();
  }),
  authorizeRole: jest.fn((allowedRoles) => (req, res, next) => {
    if (req.user && allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

app.use('/api/inventory', inventoryRouter);
app.use('/api/assemblers', assemblersRouter);

describe('Wastage and Assembler Payment Flow', () => {
  let testUser, testProduct, testAssembler, testOrder, testAssemblyJob;

  beforeEach(async () => {
    // Limpiar BD en el orden correcto
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.wastageLog.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.expectedProduction.deleteMany({});
    await prisma.orderAssemblyStep.deleteMany({});
    await prisma.orderSentComponent.deleteMany({});
    await prisma.externalProductionOrder.deleteMany({});
    await prisma.assemblerPayment.deleteMany({});
    await prisma.assembler.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.productOverhead.deleteMany({});
    await prisma.productAssemblyJob.deleteMany({});
    await prisma.productComponent.deleteMany({});
    await prisma.assemblyJob.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // Preparar datos semilla
    testUser = await prisma.user.create({
      data: { id: 1, name: 'Admin Test', email: 'admin@test.com', password: 'hash', role: 'ADMIN' }
    });

    testProduct = await prisma.product.create({
      data: { 
        internalCode: 'TEST-W-01', 
        description: 'Test Wastage Product', 
        unit: 'un',
        stock: 50, 
        priceARS: 100, 
        type: 'RAW_MATERIAL' 
      }
    });

    testAssembler = await prisma.assembler.create({
      data: { name: 'Assembler Wastage Test', address: '123 Test St', phone: '123', paymentTerms: 'BI_WEEKLY' }
    });

    // Create an assembly job to use its price for calculations if needed
    testAssemblyJob = await prisma.assemblyJob.create({
      data: {
        name: 'Ensamblado Test',
        price: 50,
        description: 'Test'
      }
    });

    testOrder = await prisma.externalProductionOrder.create({
      data: {
        orderNumber: 'OE-TEST-001',
        assemblerId: testAssembler.id,
        status: 'COMPLETED',
        dateSent: new Date('2026-03-01T10:00:00Z'),
        createdAt: new Date('2026-03-01T10:00:00Z'),
        updatedAt: new Date('2026-03-02T10:00:00Z'),
      }
    });

    // Añadir un paso completado a la orden (que le da saldo a favor al armador)
    await prisma.orderAssemblyStep.create({
      data: {
        externalProductionOrderId: testOrder.id,
        assemblyJobId: testAssemblyJob.id,
        quantity: 10,
        unitPrice: 50, // Total a pagar por este trabajo: $500
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should successfully register a wastage, linking it to the assembler and discounting stock', async () => {
    const res = await request(app)
      .post('/api/inventory/wastage')
      .send({
        productId: testProduct.id,
        quantity: 5, // Costo de merma: 5 * 100 = 500
        notes: 'Mal cosido test',
        assemblerId: testAssembler.id,
        externalProductionOrderId: testOrder.id
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('wastageMovement');
    expect(res.body).toHaveProperty('wastageLog');
    expect(res.body.wastageLog.assemblerId).toEqual(testAssembler.id);
    expect(res.body.wastageLog.costDeducted).toEqual(false);

    // Verificar que el stock disminuyó
    const updatedProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
    expect(Number(updatedProduct.stock)).toEqual(45); // 50 - 5
  });

  it('should deduct the wastage cost from the assembler payment calculation', async () => {
    // 1. Crear una merma pendiente ($200)
    await prisma.wastageLog.create({
      data: {
        productId: testProduct.id,
        quantity: 2, // 2 * $100 = $200 de descuento
        reason: 'Manchado',
        costDeducted: false,
        assemblerId: testAssembler.id,
        userId: testUser.id
      }
    });

    // 2. Comprobar el resumen de pagos
    // Total a pagar debería ser: $500 (del paso de ensamblado) - $200 (de la merma) = $300
    const summaryRes = await request(app).get('/api/assemblers/payment-summary-batch?startDate=2026-03-01&endDate=2026-03-15');
    
    expect(summaryRes.statusCode).toEqual(200);
    const summaryData = summaryRes.body.summary.find(s => s.assemblerId === testAssembler.id);
    expect(summaryData).toBeDefined();
    
    // Convertimos los Decimal a Number para la aserción
    expect(Number(summaryData.grossPayment)).toEqual(500);
    expect(Number(summaryData.deductions)).toEqual(200);
    expect(Number(summaryData.pendingPayment)).toEqual(300);

    // 3. Confirmar la liquidación
    const closeRes = await request(app)
      .post('/api/assemblers/close-fortnight-batch')
      .send({
        assemblerIds: [testAssembler.id],
        startDate: '2026-03-01',
        endDate: '2026-03-15'
      });

    expect(closeRes.statusCode).toEqual(200);
    expect(closeRes.body[0].totalPayment).toEqual(300);

    // 4. Verificar que la merma se marcó como deducida
    const updatedWastage = await prisma.wastageLog.findFirst({ where: { assemblerId: testAssembler.id } });
    expect(updatedWastage.costDeducted).toEqual(true);
  });
});