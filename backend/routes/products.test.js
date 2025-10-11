const request = require('supertest');
const express = require('express');
const productsRouter = require('./products.routes'); // Asegúrate que la ruta es correcta

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
app.use('/api/products', productsRouter);

describe('GET /api/products', () => {
  it('should return 200 OK and a list of products', async () => {
    const res = await request(app).get('/api/products?all=true');
    expect(res.statusCode).toEqual(200);
    // Como la base de datos de test está vacía, esperamos un array de productos vacío.
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBe(0);
  });
});
