const request = require('supertest');
const express = require('express');
const externalProductionOrdersRouter = require('./externalProductionOrders.routes');
// No longer importing prisma directly here for mock purposes within jest.mock
// const prisma = require('../prisma/client'); // Keep this for actual test setups

// Helper to generate a unique order number for tests
const generateUniqueOrderNumber = () => `OE-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

// Mock de authenticateToken y authorizeRole para no depender de la autenticación real en las pruebas
jest.mock('../authMiddleware', () => {
  // Mock for authorizeAssignedUserOrAdmin, defined inside the mock factory
  const mockAuthorizeAssignedUserOrAdmin = (allowedRoles, userIdField) => {
    return (req, res, next) => {
      // For testing confirm-delivery and report-failure, we need a specific status
      const { id } = req.params;
      // In a real test, you might dynamically fetch this from a mocked DB or pass it.
      // For simplicity here, we assume the order exists and has a status that allows proceeding.
      req.order = { 
        id: id, 
        status: 'OUT_FOR_DELIVERY', // Hardcode a status that allows the middleware to pass
        deliveryUserId: req.user.userId, // Assume user is assigned for simplicity
        pickupUserId: req.user.userId, // Assume user is assigned for simplicity
        // Include any other properties the route handler might need
      };
      next();
    };
  };

  return {
    authenticateToken: jest.fn((req, res, next) => {
      req.user = { userId: 1, role: 'SUPERVISOR' }; 
      next();
    }),
    authorizeRole: jest.fn((allowedRoles) => (req, res, next) => {
      next();
    }),
    authorizeAssignedUserOrAdmin: jest.fn((allowedRoles, userIdField) => mockAuthorizeAssignedUserOrAdmin(allowedRoles, userIdField)),
  };
});

const { authenticateToken } = require('../authMiddleware');

const app = express();
app.use(express.json());
app.use('/api/external-production-orders', externalProductionOrdersRouter);

// Import prisma here, outside of jest.mock, for actual test database operations
const prisma = require('../prisma/client');

describe('External Production Orders API', () => {

  // Bloque para limpiar la base de datos después de las pruebas
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /', () => {
    let product;
    let assembler;

    beforeEach(async () => {
        product = await prisma.product.create({
            data: {
                internalCode: `TEST-PROD-${Date.now()}`,
                description: 'Test Product',
                stock: 100,
                unit: 'u',
                type: 'FINISHED',
            },
        });
        assembler = await prisma.assembler.create({
            data: {
                name: `Test Assembler ${Date.now()}`,
                paymentTerms: 'BI_WEEKLY',
            },
        });
    });

    afterEach(async () => {
        await prisma.externalProductionOrder.deleteMany({});
        await prisma.product.deleteMany({});
        await prisma.assembler.deleteMany({});
    });

    it('should create an external production order in commit mode', async () => {
        const response = await request(app)
            .post('/api/external-production-orders?mode=commit')
            .send({
                assemblerId: assembler.id,
                productId: product.id,
                quantity: 10,
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe('PENDING_DELIVERY');
    });
  });


  describe('POST /:id/confirm-delivery', () => {
    let order, user, assembler;

    beforeEach(async () => {
      // Setup: Create necessary entities for the test
      user = await prisma.user.create({
        data: {
          email: `testuser-${Date.now()}@example.com`,
          password: 'password',
          role: 'EMPLOYEE',
          name: 'Test User'
        },
      });

      assembler = await prisma.assembler.create({
        data: {
          name: `Test Assembler ${Date.now()}`,
          paymentTerms: 'BI_WEEKLY',
        },
      });

      order = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: generateUniqueOrderNumber(), // Added orderNumber
          assemblerId: assembler.id,
          dateSent: new Date(),
          deliveryUserId: user.id,
          status: 'OUT_FOR_DELIVERY',
        },
      });
    });

    afterEach(async () => {
      // Teardown: Clean up created entities
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.assembler.deleteMany({});
      await prisma.user.deleteMany({});
    });

    it('should update order status to IN_ASSEMBLY when delivery is confirmed', async () => {
       authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: user.id, role: 'EMPLOYEE' };
        next();
      });

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
    let order, user, assembler;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { name: "Test User", email: `testuser-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      assembler = await prisma.assembler.create({ data: { name: `Test Assembler ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: generateUniqueOrderNumber(), // Added orderNumber
          assemblerId: assembler.id,
          dateSent: new Date(),
          deliveryUserId: user.id,
          status: 'OUT_FOR_DELIVERY',
        },
      });
        authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: user.id, role: 'EMPLOYEE' };
        next();
      });
    });

    afterEach(async () => {
        await prisma.orderNote.deleteMany({});
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.assembler.deleteMany({});
      await prisma.user.deleteMany({});
    });

    it('should update order status to DELIVERY_FAILED when delivery fails', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/report-failure`)
        .send({ notes: 'Client not available' });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('DELIVERY_FAILED');

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('DELIVERY_FAILED');
      
      const note = await prisma.orderNote.findFirst({ where: { externalProductionOrderId: order.id } });
      expect(note).not.toBeNull();
      expect(note.content).toBe('Client not available');
    });
  });

  describe('POST /:id/confirm-assembly', () => {
    let order, user, assembler;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { name: "Test User", email: `testuser-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      assembler = await prisma.assembler.create({ data: { name: `Test Assembler ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: generateUniqueOrderNumber(), // Added orderNumber
          assemblerId: assembler.id,
          dateSent: new Date(),
          status: 'IN_ASSEMBLY',
        },
      });
       authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: user.id, role: 'SUPERVISOR' };
        next();
      });
    });

    afterEach(async () => {
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.assembler.deleteMany({});
      await prisma.user.deleteMany({});
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
    let order, user, pickupUser, assembler;

    beforeEach(async () => {
      user = await prisma.user.create({ data: { name: "Test User", email: `supervisor-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      pickupUser = await prisma.user.create({ data: { name: "Test User", email: `employee-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      assembler = await prisma.assembler.create({ data: { name: `Test Assembler ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      order = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: generateUniqueOrderNumber(), // Added orderNumber
          assemblerId: assembler.id,
          dateSent: new Date(),
          status: 'PENDING_PICKUP',
        },
      });
       authenticateToken.mockImplementation((req, res, next) => {
        req.user = { userId: user.id, role: 'SUPERVISOR' };
        next();
      });
    });

    afterEach(async () => {
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.assembler.deleteMany({});
      await prisma.user.deleteMany({ where: { id: { in: [user.id, pickupUser.id] } } });
    });

    it('should update status to RETURN_IN_TRANSIT and set pickupUserId', async () => {
      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/assign-pickup`)
        .send({ userId: pickupUser.id });

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('RETURN_IN_TRANSIT');
      expect(response.body.pickupUserId).toBe(pickupUser.id);

      const dbOrder = await prisma.externalProductionOrder.findUnique({ where: { id: order.id } });
      expect(dbOrder.status).toBe('RETURN_IN_TRANSIT');
      expect(dbOrder.pickupUserId).toBe(pickupUser.id);
    });
  });

  describe('POST /:id/receive', () => {
    let order, assembler, pickupUser, supervisorUser, productA;

    beforeEach(async () => {
      // The mock uses a supervisor, so we must create one for the foreign key to work.
      supervisorUser = await prisma.user.create({ data: { name: "Test User", email: `supervisor-${Date.now()}@example.com`, password: 'password', role: 'SUPERVISOR' } });
      
      // We also need an employee for the pickup assignment itself.
      pickupUser = await prisma.user.create({ data: { name: "Test User", email: `employee-${Date.now()}@example.com`, password: 'password', role: 'EMPLOYEE' } });
      
      assembler = await prisma.assembler.create({ data: { name: `Test Assembler ${Date.now()}`, paymentTerms: 'BI_WEEKLY' } });
      productA = await prisma.product.create({ data: { internalCode: `PROD-A-${Date.now()}`, description: 'Finished Product A', unit: 'u', type: 'FINISHED', stock: 0 } });

      order = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: generateUniqueOrderNumber(), // Added orderNumber
          assemblerId: assembler.id,
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
        req.user = { userId: pickupUser.id, role: 'EMPLOYEE' };
        next();
      });
    });

    afterEach(async () => {
      await prisma.inventoryMovement.deleteMany({});
      await prisma.orderNote.deleteMany({});
      await prisma.externalProductionOrder.deleteMany({});
      await prisma.expectedProduction.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.assembler.deleteMany({});
      await prisma.user.deleteMany({});
    });

    it('should handle perfect reception, update status to COMPLETED, and increase stock', async () => {
      const initialStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(initialStock.stock)).toBe(0);

      const payload = {
        receivedItems: [
          { productId: productA.id, quantity: 10 }
        ],
        isFinalDelivery: true
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
          { productId: productA.id, quantity: 8 } // Shortage of 2
        ],
        justified: true, // Good faith discrepancy
        notes: 'Se rompieron 2 unidades en el traslado.',
        isFinalDelivery: true
      };

      const response = await request(app)
        .post(`/api/external-production-orders/${order.id}/receive`)
        .send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('COMPLETED_WITH_NOTES');

      const note = await prisma.orderNote.findFirst({ where: { externalProductionOrderId: order.id } });
      expect(note).not.toBeNull();
      expect(note.content).toBe('Se rompieron 2 unidades en el traslado.');

      const finalStock = await prisma.product.findUnique({ where: { id: productA.id } });
      expect(Number(finalStock.stock)).toBe(8);
    });

    it('should handle reception with unjustified shortage and set status to COMPLETED_WITH_DISCREPANCY', async () => {
      const payload = {
        receivedItems: [
          { productId: productA.id, quantity: 7 } // Shortage of 3
        ],
        justified: false, // Bad faith discrepancy
        isFinalDelivery: true
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