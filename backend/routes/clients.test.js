const request = require('supertest');
const express = require('express');
const clientsRouter = require('./clients.routes');
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
    // Asegurarse de que el mock de authenticateToken ya haya establecido req.user
    if (req.user && allowedRoles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

app.use('/api/clients', clientsRouter);

describe('Clients API', () => {
  // Limpiar la base de datos antes de cada test
  beforeEach(async () => {
    // Es crucial limpiar en el orden correcto para evitar problemas de FK
    await prisma.salesOrderItem.deleteMany({});
    await prisma.salesOrder.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.wastageLog.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.user.deleteMany({});
  });

  // Desconectar Prisma después de todos los tests
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/clients', () => {
    it('should create a new client', async () => {
      const newClientData = {
        name: 'Test Client',
        address: '123 Test St',
        phone: '123-456-7890',
        email: 'test@example.com',
      };
      const res = await request(app).post('/api/clients').send(newClientData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual(newClientData.name);
    });

    it('should return 400 if name is missing', async () => {
      const newClientData = {
        address: '123 Test St',
      };
      const res = await request(app).post('/api/clients').send(newClientData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0].message).toEqual('Invalid input: expected string, received undefined');
    });

    it('should return 409 if client with name already exists', async () => {
      await prisma.client.create({ data: { name: 'Existing Client' } });
      const newClientData = {
        name: 'Existing Client',
      };
      const res = await request(app).post('/api/clients').send(newClientData);

      expect(res.statusCode).toEqual(409);
      expect(res.body.error).toContain('A client with this name already exists.');
    });
  });

  describe('GET /api/clients', () => {
    it('should return all clients', async () => {
      await prisma.client.createMany({
        data: [{ name: 'Client A' }, { name: 'Client B' }],
      });
      const res = await request(app).get('/api/clients');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toEqual('Client A'); // Ordenado por nombre
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should return a client by ID', async () => {
      const client = await prisma.client.create({ data: { name: 'Find Me' } });
      const res = await request(app).get(`/api/clients/${client.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual('Find Me');
    });

    it('should return 404 if client not found', async () => {
      const res = await request(app).get('/api/clients/non-existent-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Client not found.');
    });
  });

  describe('PUT /api/clients/:id', () => {
    it('should update a client', async () => {
      const client = await prisma.client.create({ data: { name: 'Update Me' } });
      const updatedData = { name: 'Updated Client Name' };
      const res = await request(app).put(`/api/clients/${client.id}`).send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual('Updated Client Name');
    });

    it('should return 400 if name is invalid', async () => {
      const client = await prisma.client.create({ data: { name: 'Update Me' } });
      const updatedData = { name: '' }; // Invalid name (empty string)
      const res = await request(app).put(`/api/clients/${client.id}`).send(updatedData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0].message).toEqual('El nombre del cliente es requerido.');
    });

    it('should return 404 if client not found', async () => {
      const updatedData = { name: 'Non Existent' };
      const res = await request(app).put('/api/clients/non-existent-id').send(updatedData);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Client not found.');
    });
  });

  describe('DELETE /api/clients/:id', () => {
    it('should delete a client', async () => {
      const client = await prisma.client.create({ data: { name: 'Delete Me' } });
      const res = await request(app).delete(`/api/clients/${client.id}`);

      expect(res.statusCode).toEqual(204);
      const deletedClient = await prisma.client.findUnique({ where: { id: client.id } });
      expect(deletedClient).toBeNull();
    });

    it('should return 404 if client not found', async () => {
      const res = await request(app).delete('/api/clients/non-existent-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('Client not found.');
    });

    // This test will need a SalesOrder to be created first
    // it('should return 400 if client has associated sales orders', async () => {
    //   const client = await prisma.client.create({ data: { name: 'Client With Sales' } });
    //   // TODO: Create a SalesOrder linked to this client
    //   const res = await request(app).delete(`/api/clients/${client.id}`);
    //   expect(res.statusCode).toEqual(400);
    //   expect(res.body.error).toContain('Cannot delete client with associated sales orders.');
    // });
  });
});
