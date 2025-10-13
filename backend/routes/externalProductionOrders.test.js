const request = require('supertest');
const express = require('express');
const externalProductionOrdersRouter = require('./externalProductionOrders.routes');
const prisma = require('../prisma/client');

// Mock de authenticateToken para no depender de la autenticación real en las pruebas
jest.mock('../authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    // Default mock implementation, can be overridden in tests
    req.user = { id: 1, role: 'SUPERVISOR' }; 
    next();
  }),
  authorizeRole: jest.fn((allowedRoles) => (req, res, next) => {
    // Default mock implementation
    next();
  }),
}));

const { authenticateToken } = require('../authMiddleware');

const app = express();
app.use(express.json());
app.use('/api/external-production-orders', externalProductionOrdersRouter);

describe('External Production Orders API', () => {

  // Bloque para limpiar la base de datos después de las pruebas
  afterAll(async () => {
    // Aquí se agregarán las operaciones de limpieza necesarias
    await prisma.$disconnect();
  });

  it('should have a placeholder test to ensure setup is correct', () => {
    expect(true).toBe(true);
  });

  // --- Aquí comenzaremos a añadir las pruebas para cada endpoint ---

  describe('POST /:id/confirm-delivery', () => {
    let order, user, armador;

    beforeEach(async () => {
      // Setup: Create necessary entities for the test
      user = await prisma.user.create({
        data: {
          email: `testuser-${Date.now()}@example.com`,
          password: 'password',
          role: 'EMPLOYEE',
        },
      });

      armador = await prisma.armador.create({
        data: {
          name: `Test Armador ${Date.now()}`,
          paymentTerms: 'BI_WEEKLY',
        },
      });

      order = await prisma.externalProductionOrder.create({
        data: {
          armadorId: armador.id,
          dateSent: new Date(),
          deliveryUserId: user.id,
          status: 'OUT_FOR_DELIVERY',
        },
      });
    });

    afterEach(async () => {
      // Teardown: Clean up created entities
      await prisma.externalProductionOrder.deleteMany({ where: { id: order.id } });
      await prisma.armador.deleteMany({ where: { id: armador.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    it('should update order status to IN_ASSEMBLY when delivery is confirmed', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/confirm-delivery`)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('IN_ASSEMBLY');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('IN_ASSEMBLY');
    });
  });

  describe('POST /:id/report-failure', () => {
    let order, user, armador;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { email: `testuser-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      armador = await prisma.armador.create({ data: { name: `Test Armador ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          armadorId: armador.id,
          dateSent: new Date(),
          deliveryUserId: user.id,
          status: 'OUT_FOR_DELIVERY',
        },
      });
    });

    afterEach(async () => {
      await prisma.externalProductionOrder.deleteMany({ where: { id: order.id } });
      await prisma.armador.deleteMany({ where: { id: armador.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    it('should update order status to DELIVERY_FAILED when delivery fails', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/report-failure`)
        .send({ notes: 'Client not available' });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('DELIVERY_FAILED');
      expect(response.body.notes).toContain('Client not available');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('DELIVERY_FAILED');
    });
  });

  describe('POST /:id/confirm-assembly', () => {
    let order, user, armador;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { email: `testuser-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      armador = await prisma.armador.create({ data: { name: `Test Armador ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          armadorId: armador.id,
          dateSent: new Date(),
          status: 'IN_ASSEMBLY',
        },
      });
    });

    afterEach(async () => {
      await prisma.externalProductionOrder.deleteMany({ where: { id: order.id } });
      await prisma.armador.deleteMany({ where: { id: armador.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });

    it('should update order status to PENDING_PICKUP when assembly is confirmed', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/confirm-assembly`)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('PENDING_PICKUP');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('PENDING_PICKUP');
    });
  });

  describe('POST /:id/assign-pickup', () => {
    let order, user, pickupUser, armador;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { email: `supervisor-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      pickupUser = await prisma.user.create({ data: { email: `employee-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      armador = await prisma.armador.create({ data: { name: `Test Armador ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          armadorId: armador.id,
          dateSent: new Date(),
          status: 'PENDING_PICKUP',
        },
      });
    });

    afterEach(async () => {
      await prisma.externalProductionOrder.deleteMany({ where: { id: order.id } });
      await prisma.armador.deleteMany({ where: { id: armador.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, pickupUser.id] } } });
    });

    it('should update status to RETURN_IN_TRANSIT and set pickupUserId', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/assign-pickup`)
        .send({ pickupUserId: pickupUser.id });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('RETURN_IN_TRANSIT');
      expect(response.body.pickupUserId).toBe(pickupUser.id);

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('RETURN_IN_TRANSIT');
      expect(dbOrder.pickupUserId).toBe(pickupUser.id);
    });
  });

  describe('POST /:id/receive', () => {
    let order, armador, pickupUser, supervisorUser, productA;

    beforeEach(async () => {
      // The mock uses a supervisor, so we must create one for the foreign key to work.
      supervisorUser = await prisma.user.create({ data: { email: `supervisor-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      
      // We also need an employee for the pickup assignment itself.
      pickupUser = await prisma.user.create({ data: { email: `employee-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      
      armador = await prisma.armador.create({ data: { name: `Test Armador ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      productA = await prisma.product.create({ data: { internalCode: `PROD-A-${Date.now()}`, description: 'Finished Product A', unit: 'u', type: 'FINISHED' } });

      order = await prisma.externalProductionOrder.create({
        data: {
          armadorId: armador.id,
          dateSent: new Date(),
          status: 'RETURN_IN_TRANSIT',
          pickupUserId: pickupUser.id,
          expectedOutputs: {
            create: [
              { productId: productA.id, quantityExpected: 10 },
            ]
          }
        },
        include: { expectedOutputs: true }
      });

      // Update the mock to use the ID of the supervisor we just created
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: supervisorUser.id, role: 'SUPERVISOR' };
        next();
      });
    });

    afterEach(async () => {
      await prisma.inventoryMovement.deleteMany({});
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.expectedProduction.deleteMany({});
      await prisma.product.deleteMany({ where: { id: productA.id } });
      await prisma.armador.deleteMany({ where: { id: armador.id } });
      await prisma.user.deleteMany({ where: { id: { in: [pickupUser.id, supervisorUser.id] } } });
    });

    it('should handle perfect reception, update status to COMPLETED, and increase stock', async () => {
      const initialStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(initialStock.stock)).toBe(0);

      const payload = {
        receivedItems: [
          { productId: productA.id, quantityReceived: 10 }
        ],
        justified: false // Not relevant in perfect reception
      };

      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/receive`)
        .send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('COMPLETED');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('COMPLETED');

      const finalStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(finalStock.stock)).toBe(10);

      const movement = await prisma.inventoryMovement.findFirst({
        where: {
          productId: productA.id,
          type: 'RECEIVED_FROM_ASSEMBLER'
        }
      });
      expect(movement).not.toBeNull();
      expect(Number(movement.quantity)).toBe(10);
    });

    it('should handle reception with justified shortage and set status to COMPLETED_WITH_NOTES', async () => {
      const payload = {
        receivedItems: [
          { productId: productA.id, quantityReceived: 8 } // Shortage of 2
        ],
        justified: true, // Good faith discrepancy
        notes: 'Se rompieron 2 unidades en el traslado.'
      };

      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/receive`)
        .send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('COMPLETED_WITH_NOTES');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('COMPLETED_WITH_NOTES');
      expect(dbOrder.notes).toContain('Se rompieron 2 unidades en el traslado.');

      const finalStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(finalStock.stock)).toBe(8);
    });

    it('should handle reception with unjustified shortage and set status to COMPLETED_WITH_DISCREPANCY', async () => {
      const payload = {
        receivedItems: [
          { productId: productA.id, quantityReceived: 7 } // Shortage of 3
        ],
        justified: false, // Bad faith discrepancy
      };

      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/receive`)
        .send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('COMPLETED_WITH_DISCREPANCY');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('COMPLETED_WITH_DISCREPANCY');

      const finalStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(finalStock.stock)).toBe(7);
    });
  });
});
