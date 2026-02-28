const request = require('supertest');
const express = require('express');
const salesRouter = require('./sales.routes');
const prisma = require('../prisma/client');

// Import the actual authMiddleware to be mocked
const actualAuthMiddleware = jest.requireActual('../authMiddleware');

const app = express();
app.use(express.json());

// Tell Jest to mock the entire module
jest.mock('../authMiddleware', () => ({
  authenticateToken: jest.fn(),
  authorizeRole: jest.fn(() => (req, res, next) => next()), // Provide a default functional mock
}));

// Now, after jest.mock, you can import the mocked functions
const authMiddleware = require('../authMiddleware');

app.use('/api/sales', salesRouter);

describe('Sales API', () => {
  let client, priceTier, productFinished, productPreAssembled, adminUser;

  beforeEach(async () => {
    // Es crucial limpiar en el orden correcto para evitar problemas de FK
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.expectedProduction.deleteMany({}); // Added
    await prisma.orderAssemblyStep.deleteMany({}); // Added
    await prisma.orderSentComponent.deleteMany({}); // Added
    await prisma.client.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // Reset mocks before each test
    authMiddleware.authenticateToken.mockReset();
    authMiddleware.authorizeRole.mockReset();
    
    // Create a mock user for InventoryMovement userId foreign key
    adminUser = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        password: 'password',
        role: 'ADMIN',
        name: 'Test Admin',
      },
    });

    // Dynamically set mock implementation for authenticateToken
    authMiddleware.authenticateToken.mockImplementation((req, res, next) => {
      req.user = { userId: adminUser.id, role: adminUser.role };
      next();
    });

    // Set default mock for authorizeRole
    authMiddleware.authorizeRole.mockImplementation((allowedRoles) => (req, res, next) => {
      if (req.user && allowedRoles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden' });
      }
    });

    priceTier = await prisma.priceTier.create({
      data: { name: 'Standard', discountPercentage: 0 },
    });
    client = await prisma.client.create({
      data: {
        name: 'Test Client',
        email: 'test@client.com',
        priceTierId: priceTier.id,
      },
    });
    productFinished = await prisma.product.create({
      data: {
        internalCode: `FIN-${Date.now()}`,
        description: 'Finished Product',
        unit: 'u',
        type: 'FINISHED',
        stock: 100,
        priceARS: 100, // Base price
      },
    });
    productPreAssembled = await prisma.product.create({
      data: {
        internalCode: `PRE-${Date.now()}`,
        description: 'Pre-Assembled Product',
        unit: 'u',
        type: 'PRE_ASSEMBLED',
        stock: 50,
        priceARS: 50, // Base price
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/sales', () => {
    it('should create a new SalesOrder with one item and update stock', async () => {
      const salesData = {
        clientId: client.id,
        items: [
          { productId: productFinished.id, quantity: 10, unitPrice: 95 }, // Price with discount
        ],
      };

      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.clientId).toEqual(client.id);
      expect(Number(res.body.totalAmount)).toEqual(salesData.items[0].quantity * salesData.items[0].unitPrice); // Fixed type mismatch
      
      const updatedProduct = await prisma.product.findUnique({ where: { id: productFinished.id } });
      expect(Number(updatedProduct.stock)).toEqual(100 - salesData.items[0].quantity);
      
      const salesOrderItems = await prisma.salesOrderItem.findMany({ where: { salesOrderId: res.body.id } });
      expect(salesOrderItems).toHaveLength(1);
      expect(salesOrderItems[0].productId).toEqual(productFinished.id);

      const inventoryMovement = await prisma.inventoryMovement.findUnique({ where: { salesOrderId: res.body.id } });
      expect(inventoryMovement).not.toBeNull();
      expect(inventoryMovement.type).toEqual('SALE');
      expect(Number(inventoryMovement.quantity)).toEqual(salesData.items[0].quantity);
    });

    it('should create a new SalesOrder with multiple items and update stock', async () => {
      const salesData = {
        clientId: client.id,
        items: [
          { productId: productFinished.id, quantity: 5, unitPrice: 90 },
          { productId: productPreAssembled.id, quantity: 2, unitPrice: 45 },
        ],
      };

      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      
      const updatedProductFinished = await prisma.product.findUnique({ where: { id: productFinished.id } });
      expect(Number(updatedProductFinished.stock)).toEqual(100 - salesData.items[0].quantity);
      
      const updatedProductPreAssembled = await prisma.product.findUnique({ where: { id: productPreAssembled.id } });
      expect(Number(updatedProductPreAssembled.stock)).toEqual(50 - salesData.items[1].quantity);

      const salesOrderItems = await prisma.salesOrderItem.findMany({ where: { salesOrderId: res.body.id } });
      expect(salesOrderItems).toHaveLength(2);
      
      const inventoryMovement = await prisma.inventoryMovement.findUnique({ where: { salesOrderId: res.body.id } });
      expect(inventoryMovement).not.toBeNull();
      expect(inventoryMovement.type).toEqual('SALE');
      expect(Number(inventoryMovement.quantity)).toEqual(salesData.items[0].quantity + salesData.items[1].quantity);
    });

    it('should return 400 if client is missing', async () => {
      const salesData = {
        items: [{ productId: productFinished.id, quantity: 10, unitPrice: 100 }],
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].message).toEqual('Invalid input: expected string, received undefined');
    });

    it('should return 400 if items array is empty', async () => {
      const salesData = {
        clientId: client.id,
        items: [],
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].message).toEqual('La orden de venta debe contener al menos un item.');
    });

    it('should return 400 if product in item is not found', async () => {
      const salesData = {
        clientId: client.id,
        items: [{ productId: 'non-existent-product', quantity: 10, unitPrice: 100 }],
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Producto con ID non-existent-product no encontrado.');
    });

    it('should return 400 if product type is not FINISHED or PRE_ASSEMBLED', async () => {
      const productRaw = await prisma.product.create({
        data: {
          internalCode: `RAW-${Date.now()}`,
          description: 'Raw Material',
          unit: 'kg',
          type: 'RAW_MATERIAL',
          stock: 100,
        },
      });
      const salesData = {
        clientId: client.id,
        items: [{ productId: productRaw.id, quantity: 10, unitPrice: 100 }],
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Solo se pueden vender productos de tipo FINISHED o PRE_ASSEMBLED.');
    });

    it('should create a SalesOrder even if stock is insufficient, and update stock to a negative value', async () => {
      const salesData = {
        clientId: client.id,
        items: [{ productId: productFinished.id, quantity: 200, unitPrice: 100 }], // More than available
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(201); // Expect 201 Created, as negative stock is allowed
      expect(res.body).toHaveProperty('id');
      
      const updatedProduct = await prisma.product.findUnique({ where: { id: productFinished.id } });
      expect(Number(updatedProduct.stock)).toEqual(100 - salesData.items[0].quantity); // Expect negative stock
    });

    it('should return 400 if quantity in item is invalid', async () => {
      const salesData = {
        clientId: client.id,
        items: [{ productId: productFinished.id, quantity: 0, unitPrice: 100 }], // Invalid quantity
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].message).toEqual('La cantidad debe ser un número positivo.');
    });

    it('should handle different payment statuses', async () => {
      const salesData = {
        clientId: client.id,
        paymentStatus: 'CREDITED', // Test different status
        items: [{ productId: productFinished.id, quantity: 10, unitPrice: 100 }],
      };
      const res = await request(app).post('/api/sales').send(salesData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.paymentStatus).toEqual('CREDITED');
    });
  });
});
