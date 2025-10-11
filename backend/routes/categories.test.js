const request = require('supertest');
const express = require('express');
const categoriesRouter = require('./categories.routes'); // Assuming this exists and exports the router

// Mock de authenticateToken para no depender de la autenticación real en este test
jest.mock('../authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'ADMIN', username: 'testadmin' }; // Mock de usuario admin
    next();
  },
  authorizeRole: (allowedRoles) => (req, res, next) => {
    req.user = req.user || { id: 1, role: 'ADMIN', username: 'testadmin' }; // Ensure req.user is set if not already
    next();
  },
}));

const app = express();
app.use(express.json());
const prisma = require('../prisma/client'); // Import prisma client

app.use('/api/categories', categoriesRouter);

describe('POST /api/categories', () => {
  afterEach(async () => {
    // Clean up database after each test
    await prisma.category.deleteMany({
      where: { name: 'Test Category' },
    });
  });

  it('should return 400 if category name is missing', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({}); // Empty body, missing name
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors[0].message).toEqual('Invalid input: expected string, received undefined');
  });

  it('should return 201 and create a new category if name is valid', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Category' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Test Category');
  });
});
