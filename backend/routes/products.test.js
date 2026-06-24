const request = require('supertest');
const express = require('express');
const productsRouter = require('./products.routes');
const prisma = require('../prisma/client');

const app = mapApp();

function mapApp() {
  const localApp = express();
  localApp.use(express.json());
  return localApp;
}

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

app.use('/api/products', productsRouter);


describe('Products CRUD Operations', () => {
  beforeEach(async () => {
    // Es crucial limpiar en el orden correcto para evitar problemas de FK
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.wastageLog.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.expectedProduction.deleteMany({});
    await prisma.orderAssemblyStep.deleteMany({});
    await prisma.orderSentComponent.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  it('should return 200 OK and a list of products', async () => {
    const res = await request(app).get('/api/products');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('should create a new product successfully (POST /api/products)', async () => {
    const productData = {
      internalCode: 'PROD-001',
      description: 'Test Raw Material Product',
      type: 'RAW_MATERIAL',
      unit: 'un',
      priceARS: 120.50,
      stock: 0
    };

    const res = await request(app)
      .post('/api/products')
      .send(productData);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.internalCode).toEqual('PROD-001');
    expect(res.body.description).toEqual('Test Raw Material Product');
  });

  it('should fail to create product if missing required internalCode (POST /api/products)', async () => {
    const productData = {
      description: 'Missing Code Product',
      type: 'RAW_MATERIAL',
      unit: 'un',
      priceARS: 100
    };

    const res = await request(app)
      .post('/api/products')
      .send(productData);

    expect(res.statusCode).toEqual(400); // Validation failure
  });

  it('should update product details successfully (PUT /api/products/:id)', async () => {
    // 1. Create a product first
    const createdProduct = await prisma.product.create({
      data: {
        internalCode: 'PROD-UPD',
        description: 'Original Description',
        type: 'RAW_MATERIAL',
        unit: 'un',
        priceARS: 150.00,
        stock: 5
      }
    });

    // 2. Update it
    const updateData = {
      internalCode: 'PROD-UPD',
      description: 'New Updated Description',
      type: 'RAW_MATERIAL',
      unit: 'un',
      priceARS: 175.50
    };

    const res = await request(app)
      .put(`/api/products/${createdProduct.id}`)
      .send(updateData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.description).toEqual('New Updated Description');
    expect(Number(res.body.priceARS)).toEqual(175.50);
  });

  it('should delete a product successfully (DELETE /api/products/:id)', async () => {
    // 1. Create a product first
    const createdProduct = await prisma.product.create({
      data: {
        internalCode: 'PROD-DEL',
        description: 'Product to Delete',
        type: 'RAW_MATERIAL',
        unit: 'un',
        priceARS: 10.00,
        stock: 0
      }
    });

    // 2. Delete it
    const res = await request(app).delete(`/api/products/${createdProduct.id}`);

    expect(res.statusCode).toEqual(204); // No Content

    // 3. Verify it is gone
    const found = await prisma.product.findUnique({ where: { id: createdProduct.id } });
    expect(found).toBeNull();
  });
});
