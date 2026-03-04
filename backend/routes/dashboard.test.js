const request = require('supertest');
const express = require('express');
const dashboardRouter = require('./dashboard.routes');
const prisma = require('../prisma/client');

const app = express();
app.use(express.json());

// Mock auth middleware to test different roles
jest.mock('../authMiddleware', () => {
  let mockUser = { userId: 1, role: 'SUPERVISOR' }; // Default mock
  return {
    authenticateToken: jest.fn((req, res, next) => {
      req.user = mockUser;
      next();
    }),
    authorizeRole: jest.fn(() => (req, res, next) => next()), // Simple pass-through for this test
    setMockUser: (user) => { mockUser = user; } // Helper to change user per test
  };
});

const { setMockUser } = require('../authMiddleware');

app.use('/api/dashboard', dashboardRouter);

describe('Dashboard Engine API', () => {
  let supervisorUser, employeeUser, assembler, productLowStock, productNormalStock;

  beforeEach(async () => {
    // 1. Clean Database
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
    await prisma.productOverhead.deleteMany({});
    await prisma.productAssemblyJob.deleteMany({});
    await prisma.productComponent.deleteMany({});
    await prisma.assemblyJob.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Setup Base Data
    supervisorUser = await prisma.user.create({
      data: { id: 1, name: 'Supervisor', email: 'sup@test.com', password: 'hash', role: 'SUPERVISOR' }
    });
    employeeUser = await prisma.user.create({
      data: { id: 2, name: 'Employee', email: 'emp@test.com', password: 'hash', role: 'EMPLOYEE' }
    });
    assembler = await prisma.assembler.create({
      data: { name: 'Test Assembler', phone: '123', paymentTerms: 'BI_WEEKLY' }
    });

    productLowStock = await prisma.product.create({
      data: { internalCode: 'LOW-01', description: 'Low Stock', unit: 'u', type: 'RAW_MATERIAL', stock: 5, lowStockThreshold: 10 }
    });
    
    productNormalStock = await prisma.product.create({
      data: { internalCode: 'NORM-01', description: 'Normal Stock', unit: 'u', type: 'RAW_MATERIAL', stock: 50, lowStockThreshold: 10 }
    });

    // Reset to Supervisor for safety
    setMockUser({ userId: supervisorUser.id, role: 'SUPERVISOR' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Supervisor Rules Engine', () => {
    
    it('should generate a Precaution for Low Stock (stock > 0 but <= threshold)', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);
      
      const lowStockPrecaution = res.body.precautions.find(p => p.id === `prec-stock-${productLowStock.id}`);
      expect(lowStockPrecaution).toBeDefined();
      expect(lowStockPrecaution.type).toEqual('LOW_STOCK');
      
      const normalStockPrecaution = res.body.precautions.find(p => p.id === `prec-stock-${productNormalStock.id}`);
      expect(normalStockPrecaution).toBeUndefined();
    });

    it('should generate a Critical Alert for Stock Out (stock <= 0)', async () => {
      const productOut = await prisma.product.create({
        data: { internalCode: 'OUT-01', description: 'Out of Stock', unit: 'u', type: 'RAW_MATERIAL', stock: 0, lowStockThreshold: 10 }
      });

      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);
      
      const stockOutAlert = res.body.criticalAlerts.find(a => a.id === `crit-stock-${productOut.id}`);
      expect(stockOutAlert).toBeDefined();
      expect(stockOutAlert.type).toEqual('STOCK_OUT');
    });

    it('should generate a Critical Alert for Assembler Inactivity (> 3 business days)', async () => {
      // Simulate an order that was updated 5 days ago (to safely pass 3 business days)
      const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const inactiveOrder = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: 'OE-INACT-01',
          assemblerId: assembler.id,
          status: 'IN_ASSEMBLY',
          dateSent: oldDate,
          createdAt: oldDate,
          updatedAt: oldDate, // KEY FIELD
        }
      });

      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);

      const inactivityAlert = res.body.criticalAlerts.find(a => a.id === `crit-inact-${inactiveOrder.id}`);
      expect(inactivityAlert).toBeDefined();
      expect(inactivityAlert.type).toEqual('INACTIVITY');
    });

    it('should generate a Precaution for Logistics Delay (> 24 hours in transit)', async () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const delayedOrder = await prisma.externalProductionOrder.create({
        data: {
          orderNumber: 'OE-DELAY-01',
          assemblerId: assembler.id,
          status: 'OUT_FOR_DELIVERY', // Transitional status
          deliveryUserId: employeeUser.id,
          dateSent: yesterday,
          createdAt: yesterday,
          updatedAt: yesterday, // KEY FIELD
        }
      });

      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);

      const delayPrecaution = res.body.precautions.find(p => p.id === `prec-delay-${delayedOrder.id}`);
      expect(delayPrecaution).toBeDefined();
      expect(delayPrecaution.type).toEqual('DELAY');
    });

    it('should generate a Critical Alert for Poor Performance (3+ wastages in 15 days)', async () => {
      // Create 3 wastages for the same assembler
      for(let i=0; i<3; i++) {
        await prisma.wastageLog.create({
          data: {
            productId: productNormalStock.id,
            quantity: 1,
            reason: 'Test Failure',
            assemblerId: assembler.id,
            userId: supervisorUser.id,
            costDeducted: false,
          }
        });
      }

      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);

      const performanceAlert = res.body.criticalAlerts.find(a => a.id === `crit-waste-${assembler.id}`);
      expect(performanceAlert).toBeDefined();
      expect(performanceAlert.type).toEqual('POOR_PERFORMANCE');
      expect(performanceAlert.message).toContain('3 veces');
    });
  });

  describe('Employee Tasks Engine', () => {
    it('should list delivery and pickup tasks assigned to the employee', async () => {
      setMockUser({ userId: employeeUser.id, role: 'EMPLOYEE' });

      // Assign one delivery and one pickup to the employee
      const deliveryOrder = await prisma.externalProductionOrder.create({
        data: { orderNumber: 'DEL-01', assemblerId: assembler.id, status: 'OUT_FOR_DELIVERY', dateSent: new Date(), deliveryUserId: employeeUser.id }
      });
      const pickupOrder = await prisma.externalProductionOrder.create({
        data: { orderNumber: 'PICK-01', assemblerId: assembler.id, status: 'PENDING_PICKUP', dateSent: new Date(), pickupUserId: employeeUser.id }
      });

      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toEqual(200);

      // Employee only gets 'tasks' in the root body, no precautions/alerts logic for them yet
      expect(res.body.tasks).toBeDefined();
      
      const deliveryTask = res.body.tasks.find(t => t.id === `delivery-${deliveryOrder.id}`);
      expect(deliveryTask).toBeDefined();
      
      const pickupTask = res.body.tasks.find(t => t.id === `pickup-${pickupOrder.id}`);
      expect(pickupTask).toBeDefined();
    });
  });
});