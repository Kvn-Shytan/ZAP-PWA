const request = require('supertest');
const express = require('express');
const priceTiersRouter = require('./priceTiers.routes');
const prisma = require('../prisma/client');

const app = express();
app.use(express.json());

// Mock de authenticateToken y authorizeRole para simular un usuario autenticado y autorizado
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

app.use('/api/price-tiers', priceTiersRouter);

describe('PriceTiers API', () => {
  // Limpiar la base de datos antes de cada test
  beforeEach(async () => {
    // Es crucial limpiar en el orden correcto para evitar problemas de FK
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.user.deleteMany({});
  });

  // Desconectar Prisma después de todos los tests
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/price-tiers', () => {
    it('should create a new price tier', async () => {
      const newPriceTierData = {
        name: 'Major Client Tier',
        description: 'Tier for major clients with special discounts',
        discountPercentage: 0.15, // 15% discount
      };
      const res = await request(app).post('/api/price-tiers').send(newPriceTierData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual(newPriceTierData.name);
      expect(Number(res.body.discountPercentage)).toEqual(newPriceTierData.discountPercentage);
    });

    it('should return 400 if name is missing', async () => {
      const newPriceTierData = {
        discountPercentage: 0.10,
      };
      const res = await request(app).post('/api/price-tiers').send(newPriceTierData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      // Cuando falta la propiedad, Zod lanza el error de tipo por defecto
      expect(res.body.errors[0].message).toEqual('Invalid input: expected string, received undefined'); 
    });

    it('should return 400 if discountPercentage is invalid (negative)', async () => {
      const newPriceTierData = {
        name: 'Invalid Tier',
        discountPercentage: -0.05,
      };
      const res = await request(app).post('/api/price-tiers').send(newPriceTierData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0].message).toEqual('El porcentaje de descuento debe ser no negativo.');
    });

    it('should return 400 if discountPercentage is invalid (greater than 1)', async () => {
      const newPriceTierData = {
        name: 'Invalid Tier',
        discountPercentage: 1.05,
      };
      const res = await request(app).post('/api/price-tiers').send(newPriceTierData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0].message).toEqual('El porcentaje de descuento no puede ser mayor a 1 (100%).');
    });

    it('should return 409 if price tier with name already exists', async () => {
      await prisma.priceTier.create({ data: { name: 'Existing Tier', discountPercentage: 0.05 } });
      const newPriceTierData = {
        name: 'Existing Tier',
        discountPercentage: 0.10,
      };
      const res = await request(app).post('/api/price-tiers').send(newPriceTierData);

      expect(res.statusCode).toEqual(409);
      expect(res.body.error).toContain('A price tier with this name already exists.');
    });
  });

  describe('GET /api/price-tiers', () => {
    it('should return all price tiers', async () => {
      await prisma.priceTier.createMany({
        data: [{ name: 'Tier A', discountPercentage: 0.01 }, { name: 'Tier B', discountPercentage: 0.02 }],
      });
      const res = await request(app).get('/api/price-tiers');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toEqual('Tier A'); // Ordenado por nombre
    });
  });

  describe('GET /api/price-tiers/:id', () => {
    it('should return a price tier by ID', async () => {
      const priceTier = await prisma.priceTier.create({ data: { name: 'Find Me Tier', discountPercentage: 0.03 } });
      const res = await request(app).get(`/api/price-tiers/${priceTier.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual('Find Me Tier');
    });

    it('should return 404 if price tier not found', async () => {
      const res = await request(app).get('/api/price-tiers/non-existent-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Price tier not found.');
    });
  });

  describe('PUT /api/price-tiers/:id', () => {
    it('should update a price tier', async () => {
      const priceTier = await prisma.priceTier.create({ data: { name: 'Update Me Tier', discountPercentage: 0.04 } });
      const updatedData = { name: 'Updated Tier Name', discountPercentage: 0.06 };
      const res = await request(app).put(`/api/price-tiers/${priceTier.id}`).send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual('Updated Tier Name');
      expect(Number(res.body.discountPercentage)).toEqual(updatedData.discountPercentage);
    });

    it('should return 400 if name is invalid', async () => {
      const priceTier = await prisma.priceTier.create({ data: { name: 'Update Me Tier', discountPercentage: 0.1 } });
      const updatedData = { name: '', discountPercentage: 0.2 }; // Invalid name but valid discount
      const res = await request(app).put(`/api/price-tiers/${priceTier.id}`).send(updatedData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0].message).toEqual('El nombre del nivel de precio es requerido.');
    });

    it('should return 404 if price tier not found', async () => {
      const updatedData = { name: 'Non Existent', discountPercentage: 0.1 }; // Valid data schema
      const res = await request(app).put('/api/price-tiers/non-existent-id').send(updatedData);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Price tier not found.');
    });
  });

  describe('DELETE /api/price-tiers/:id', () => {
    it('should delete a price tier', async () => {
      const priceTier = await prisma.priceTier.create({ data: { name: 'Delete Me Tier', discountPercentage: 0.07 } });
      const res = await request(app).delete(`/api/price-tiers/${priceTier.id}`);

      expect(res.statusCode).toEqual(204);
      const deletedPriceTier = await prisma.priceTier.findUnique({ where: { id: priceTier.id } });
      expect(deletedPriceTier).toBeNull();
    });

    it('should return 404 if price tier not found', async () => {
      const res = await request(app).delete('/api/price-tiers/non-existent-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Price tier not found.');
    });

    it('should return 400 if price tier is assigned to clients', async () => {
      const priceTier = await prisma.priceTier.create({ data: { name: 'Assigned Tier', discountPercentage: 0.08 } });
      await prisma.client.create({ data: { name: 'Client with Tier', priceTierId: priceTier.id } });

      const res = await request(app).delete(`/api/price-tiers/${priceTier.id}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Cannot delete price tier assigned to clients.');
    });
  });
});
