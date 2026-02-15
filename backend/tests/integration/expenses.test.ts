/**
 * @fileoverview Integration tests for Expenses API endpoints
 * Tests CRUD operations, authentication, pagination, filtering, and user isolation
 *
 * @see src/routes/expenses.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createTestDb } from '../helpers/testDb.js';
import type { Knex } from 'knex';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let testDb: Knex;
let app: express.Express;
let authToken: string;
let userId: number;

// Helper to create a valid JWT token
function createToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });
}

beforeAll(async () => {
  // Create and initialize the test database
  testDb = createTestDb();
  await testDb.migrate.latest();
  await testDb.seed.run();

  // Mock the database module
  vi.doMock('../../src/db/knex.js', () => ({
    default: testDb,
  }));

  // Dynamically import routes AFTER mocking
  const expenseRoutes = (await import('../../src/routes/expenses.js')).default;

  // Create test app
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/expenses', expenseRoutes);

  // Create a test user
  const [id] = await testDb('users').insert({
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
  });
  userId = id;
  authToken = createToken(userId, 'test@example.com');
});

afterEach(async () => {
  // Clean up expenses between tests
  await testDb('expenses').del();
});

afterAll(async () => {
  await testDb.destroy();
  vi.resetModules();
});

describe('Expenses API Integration Tests', () => {
  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      // Arrange - no setup needed

      // Act
      const response = await request(app).get('/api/expenses');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 with invalid token', async () => {
      // Arrange - invalid token

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid-token');

      // Assert - Auth middleware returns 403 for invalid tokens (vs 401 for no token)
      expect(response.status).toBe(403);
    });

    it('should return 403 with malformed auth header', async () => {
      // Arrange - malformed header

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'NotBearer token');

      // Assert - Auth middleware returns 403 for invalid tokens
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/expenses', () => {
    it('should return empty array when no expenses exist', async () => {
      // Arrange - no expenses in database

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return expenses for authenticated user', async () => {
      // Arrange
      await testDb('expenses').insert({
        userId,
        categoryId: 1,
        amount: 50,
        description: 'Test expense',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Test expense');
      expect(response.body[0].categoryName).toBeDefined();
    });

    it('should support pagination', async () => {
      // Arrange - create multiple expenses
      for (let i = 0; i < 5; i++) {
        await testDb('expenses').insert({
          userId,
          categoryId: 1,
          amount: 10 * (i + 1),
          description: `Expense ${i + 1}`,
          date: '2024-01-15',
        });
      }

      // Act
      const response = await request(app)
        .get('/api/expenses?limit=2&offset=1')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      // Arrange
      await testDb('expenses').insert([
        { userId, categoryId: 1, amount: 10, description: 'Jan expense', date: '2024-01-15' },
        { userId, categoryId: 1, amount: 20, description: 'Feb expense', date: '2024-02-15' },
        { userId, categoryId: 1, amount: 30, description: 'Mar expense', date: '2024-03-15' },
      ]);

      // Act
      const response = await request(app)
        .get('/api/expenses?startDate=2024-02-01&endDate=2024-02-28')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Feb expense');
    });

    it('should search by description', async () => {
      // Arrange
      await testDb('expenses').insert([
        { userId, categoryId: 1, amount: 10, description: 'Grocery shopping', date: '2024-01-15' },
        { userId, categoryId: 1, amount: 20, description: 'Coffee', date: '2024-01-16' },
      ]);

      // Act
      const response = await request(app)
        .get('/api/expenses?search=grocery')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Grocery shopping');
    });

    it('should not return other users expenses', async () => {
      // Arrange - create another user with their own expense
      const [otherUserId] = await testDb('users').insert({
        email: 'other@example.com',
        passwordHash: 'hashedpassword',
      });
      await testDb('expenses').insert({
        userId: otherUserId,
        categoryId: 1,
        amount: 100,
        description: 'Other user expense',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/expenses/monthly-total', () => {
    it('should return 0 when no expenses exist', async () => {
      // Arrange - no expenses in database

      // Act
      const response = await request(app)
        .get('/api/expenses/monthly-total?year=2024&month=1')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });

    it('should return total for specified month', async () => {
      // Arrange
      await testDb('expenses').insert([
        { userId, categoryId: 1, amount: 100, description: 'Expense 1', date: '2024-01-10' },
        { userId, categoryId: 1, amount: 200, description: 'Expense 2', date: '2024-01-20' },
        { userId, categoryId: 1, amount: 50, description: 'Feb expense', date: '2024-02-15' },
      ]);

      // Act
      const response = await request(app)
        .get('/api/expenses/monthly-total?year=2024&month=1')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(300);
      expect(response.body.year).toBe(2024);
      expect(response.body.month).toBe(1);
    });
  });

  describe('GET /api/expenses/:id', () => {
    it('should return expense by id', async () => {
      // Arrange
      const [expenseId] = await testDb('expenses').insert({
        userId,
        categoryId: 1,
        amount: 50,
        description: 'Test expense',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .get(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(expenseId);
      expect(response.body.description).toBe('Test expense');
    });

    it('should return 404 for non-existent expense', async () => {
      // Arrange - no expense with this ID

      // Act
      const response = await request(app)
        .get('/api/expenses/99999')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 404 for other users expense', async () => {
      // Arrange - create another user and their expense
      const [otherUserId] = await testDb('users').insert({
        email: 'other2@example.com',
        passwordHash: 'hashedpassword',
      });
      const [expenseId] = await testDb('expenses').insert({
        userId: otherUserId,
        categoryId: 1,
        amount: 100,
        description: 'Other expense',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .get(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/expenses', () => {
    it('should create a new expense', async () => {
      // Arrange
      const expenseData = {
        categoryId: 1,
        amount: 75.50,
        description: 'New expense',
        date: '2024-01-15',
      };

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(75.5);
      expect(response.body.description).toBe('New expense');
      expect(response.body.userId).toBe(userId);
    });

    it('should return 400 for invalid amount (negative)', async () => {
      // Arrange
      const invalidData = {
        categoryId: 1,
        amount: -50,
        description: 'Invalid expense',
        date: '2024-01-15',
      };

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid date format', async () => {
      // Arrange
      const invalidData = {
        categoryId: 1,
        amount: 50,
        description: 'Invalid expense',
        date: '01-15-2024', // Wrong format
      };

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for empty description', async () => {
      // Arrange
      const invalidData = {
        categoryId: 1,
        amount: 50,
        description: '',
        date: '2024-01-15',
      };

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const incompleteData = { amount: 50 };

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/expenses/:id', () => {
    it('should update an expense', async () => {
      // Arrange
      const [expenseId] = await testDb('expenses').insert({
        userId,
        categoryId: 1,
        amount: 50,
        description: 'Original expense',
        date: '2024-01-15',
      });
      const updateData = { amount: 100, description: 'Updated expense' };

      // Act
      const response = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(100);
      expect(response.body.description).toBe('Updated expense');
    });

    it('should return 404 for non-existent expense', async () => {
      // Arrange
      const updateData = { amount: 100 };

      // Act
      const response = await request(app)
        .put('/api/expenses/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const [expenseId] = await testDb('expenses').insert({
        userId,
        categoryId: 1,
        amount: 50,
        description: 'Test expense',
        date: '2024-01-15',
      });
      const invalidData = { amount: -100 }; // Invalid negative amount

      // Act
      const response = await request(app)
        .put(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('should delete an expense', async () => {
      // Arrange
      const [expenseId] = await testDb('expenses').insert({
        userId,
        categoryId: 1,
        amount: 50,
        description: 'To delete',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(204);
      const expense = await testDb('expenses').where({ id: expenseId }).first();
      expect(expense).toBeUndefined();
    });

    it('should return 404 for non-existent expense', async () => {
      // Arrange - no expense with this ID

      // Act
      const response = await request(app)
        .delete('/api/expenses/99999')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting other users expense', async () => {
      // Arrange - create another user and their expense
      const [otherUserId] = await testDb('users').insert({
        email: 'other3@example.com',
        passwordHash: 'hashedpassword',
      });
      const [expenseId] = await testDb('expenses').insert({
        userId: otherUserId,
        categoryId: 1,
        amount: 100,
        description: 'Other expense',
        date: '2024-01-15',
      });

      // Act
      const response = await request(app)
        .delete(`/api/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(404);
      const expense = await testDb('expenses').where({ id: expenseId }).first();
      expect(expense).toBeDefined();
    });
  });
});
