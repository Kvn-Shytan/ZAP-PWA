const request = require('supertest');
const express = require('express');
const inventoryRouter = require('./inventory.routes');
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

describe('Inventory Advanced Operations & Reversals', () => {
  let testComponent, testFinishedProduct, testRecipe;

  beforeEach(async () => {
    // Limpiar BD en el orden correcto para FKs
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
    await prisma.productComponent.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. Crear usuario de prueba
    await prisma.user.create({
      data: {
        id: 1,
        name: 'Admin Tester',
        email: 'admin@zap.com',
        password: 'hashedpassword',
        role: 'ADMIN',
      }
    });

    // 2. Crear Componente de prueba (Materia Prima)
    testComponent = await prisma.product.create({
      data: {
        internalCode: 'COMP-001',
        description: 'Test Thread Component',
        type: 'RAW_MATERIAL',
        unit: 'un',
        priceARS: 50.00,
        stock: 100 // Stock inicial de 100
      }
    });

    // 3. Crear Producto Terminado de prueba
    testFinishedProduct = await prisma.product.create({
      data: {
        internalCode: 'FIN-001',
        description: 'Test Finished Shoes',
        type: 'FINISHED',
        unit: 'un',
        priceARS: 500.00,
        stock: 0 // Inicia con 0 stock
      }
    });

    // 4. Crear Receta (Vincular Componente al Producto Terminado)
    testRecipe = await prisma.productComponent.create({
      data: {
        productId: testFinishedProduct.id,
        componentId: testComponent.id,
        quantity: 2 // Requiere 2 hilos por zapato
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a valid purchase of raw material (POST /api/inventory/purchase)', async () => {
    const res = await request(app)
      .post('/api/inventory/purchase')
      .send({
        productId: testComponent.id,
        quantity: 50,
        notes: 'Compra de 50 hilos de prueba'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.type).toEqual('PURCHASE');
    expect(Number(res.body.quantity)).toEqual(50);

    // Verificar stock incrementado (100 + 50 = 150)
    const updatedComponent = await prisma.product.findUnique({ where: { id: testComponent.id } });
    expect(Number(updatedComponent.stock)).toEqual(150);
  });

  it('should fail to register a purchase on a non RAW_MATERIAL product', async () => {
    const res = await request(app)
      .post('/api/inventory/purchase')
      .send({
        productId: testFinishedProduct.id,
        quantity: 10,
        notes: 'Compra no permitida'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Solo se pueden registrar compras de productos tipo RAW_MATERIAL');
  });

  it('should register a production, decrementing components and incrementing product (POST /api/inventory/production)', async () => {
    const res = await request(app)
      .post('/api/inventory/production')
      .send({
        productId: testFinishedProduct.id,
        quantity: 10 // Producir 10 zapatos (necesita 20 hilos)
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('productionIn');
    expect(res.body).toHaveProperty('componentMovements');

    // Verificar stock del producto terminado incrementado (0 + 10 = 10)
    const updatedProduct = await prisma.product.findUnique({ where: { id: testFinishedProduct.id } });
    expect(Number(updatedProduct.stock)).toEqual(10);

    // Verificar stock del componente decrementado (100 - 20 = 80)
    const updatedComponent = await prisma.product.findUnique({ where: { id: testComponent.id } });
    expect(Number(updatedComponent.stock)).toEqual(80);
  });

  it('should fail to register production if component stock is insufficient', async () => {
    const res = await request(app)
      .post('/api/inventory/production')
      .send({
        productId: testFinishedProduct.id,
        quantity: 60 // Producir 60 zapatos (necesita 120 hilos, pero solo hay 100)
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Stock insuficiente para el componente');
  });

  it('should reverse a purchase, decrementing product stock (POST /api/inventory/reversal)', async () => {
    // 1. Registrar una compra de 50 ítems (stock del componente pasa a 150)
    const purchaseMovement = await prisma.inventoryMovement.create({
      data: {
        productId: testComponent.id,
        type: 'PURCHASE',
        quantity: 50,
        userId: 1,
        notes: 'Compra original'
      }
    });
    await prisma.product.update({
      where: { id: testComponent.id },
      data: { stock: { increment: 50 } }
    });

    // 2. Anular la compra
    const res = await request(app)
      .post('/api/inventory/reversal')
      .send({
        movementId: purchaseMovement.id
      });

    expect(res.statusCode).toEqual(201);
    
    // 3. Verificar stock del componente decrementado de vuelta a 100
    const updatedComponent = await prisma.product.findUnique({ where: { id: testComponent.id } });
    expect(Number(updatedComponent.stock)).toEqual(100);
  });

  it('should fail to reverse a purchase if resulting stock would be negative', async () => {
    // 1. Registrar una compra de 50 ítems (stock del componente pasa de 100 a 150)
    const purchaseMovement = await prisma.inventoryMovement.create({
      data: {
        productId: testComponent.id,
        type: 'PURCHASE',
        quantity: 50,
        userId: 1,
        notes: 'Compra original'
      }
    });
    await prisma.product.update({
      where: { id: testComponent.id },
      data: { stock: { increment: 50 } }
    });

    // 2. Consumir el stock de forma que nos queden solo 10 en stock (menor a la compra de 50)
    await prisma.product.update({
      where: { id: testComponent.id },
      data: { stock: 10 } // Seteamos el stock a 10
    });

    // 3. Intentar anular la compra de 50 (fallará porque resultaría en stock de 10 - 50 = -40)
    const res = await request(app)
      .post('/api/inventory/reversal')
      .send({
        movementId: purchaseMovement.id
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('sería negativo');

    // 4. Verificar que el stock se mantiene en 10 intacto
    const updatedComponent = await prisma.product.findUnique({ where: { id: testComponent.id } });
    expect(Number(updatedComponent.stock)).toEqual(10);
  });
});
