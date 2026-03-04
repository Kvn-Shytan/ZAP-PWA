const request = require('supertest');
const express = require('express');
const assemblersRouter = require('./assemblers.routes');
const prisma = require('../prisma/client');

const app = express();
app.use(express.json());

// Mock auth middleware to easily switch roles
jest.mock('../authMiddleware', () => {
  let mockRole = 'EMPLOYEE'; // Default to least privileged
  return {
    authenticateToken: jest.fn((req, res, next) => {
      req.user = { userId: 1, role: mockRole };
      next();
    }),
    authorizeRole: jest.requireActual('../authMiddleware').authorizeRole, // We want to test the actual authorizeRole logic!
    setMockRole: (role) => { mockRole = role; }
  };
});

const { setMockRole } = require('../authMiddleware');

// Mount routes to test
app.use('/api/assemblers', assemblersRouter);

describe('Role-Based Access Control (Security) API', () => {

  beforeEach(() => {
    // Reset role to EMPLOYEE before each test
    setMockRole('EMPLOYEE');
  });

  describe('Admin Exclusive Routes', () => {
    
    it('should return 403 Forbidden when EMPLOYEE tries to close fortnight batch', async () => {
      const res = await request(app)
        .post('/api/assemblers/close-fortnight-batch')
        .send({
          assemblerIds: ['test-id'],
          startDate: '2026-03-01',
          endDate: '2026-03-15'
        });

      // Employee shouldn't be allowed
      expect(res.statusCode).toEqual(403);
    });

    it('should return 403 Forbidden when SUPERVISOR tries to close fortnight batch', async () => {
      setMockRole('SUPERVISOR');

      const res = await request(app)
        .post('/api/assemblers/close-fortnight-batch')
        .send({
          assemblerIds: ['test-id'],
          startDate: '2026-03-01',
          endDate: '2026-03-15'
        });

      // Supervisor shouldn't be allowed either
      expect(res.statusCode).toEqual(403);
    });

    it('should NOT return 403 when ADMIN tries to close fortnight batch', async () => {
      setMockRole('ADMIN');

      const res = await request(app)
        .post('/api/assemblers/close-fortnight-batch')
        .send({
          assemblerIds: ['test-id'],
          startDate: '2026-03-01',
          endDate: '2026-03-15'
        });

      // 400 means it passed the authorization block and hit validation, which is fine for this test.
      expect(res.statusCode).not.toEqual(403);
    });
  });

  describe('Supervisor & Admin Routes', () => {

    it('should return 403 Forbidden when EMPLOYEE tries to get payment summary', async () => {
      const res = await request(app).get('/api/assemblers/payment-summary-batch?startDate=2026-03-01&endDate=2026-03-15');

      expect(res.statusCode).toEqual(403);
    });

    it('should allow SUPERVISOR to get payment summary', async () => {
      setMockRole('SUPERVISOR');
      
      const res = await request(app).get('/api/assemblers/payment-summary-batch?startDate=2026-03-01&endDate=2026-03-15');

      // 200 means success
      expect(res.statusCode).toEqual(200);
    });

    it('should allow ADMIN to get payment summary', async () => {
      setMockRole('ADMIN');
      
      const res = await request(app).get('/api/assemblers/payment-summary-batch?startDate=2026-03-01&endDate=2026-03-15');

      // 200 means success
      expect(res.statusCode).toEqual(200);
    });
  });
});
