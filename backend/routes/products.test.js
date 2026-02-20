const request = require('supertest');
const express = require('express');
const productsRouter = require('./products.routes');
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

app.use('/api/products', productsRouter);


describe('GET /api/products', () => {
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
});
