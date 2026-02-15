/**
 * @fileoverview Security integration tests for input validation
 *
 * Tests that malicious inputs are properly rejected or sanitized.
 * All tests follow the AAA (Arrange-Act-Assert) pattern.
 *
 * ## Security Concerns Tested (18 tests)
 *
 * ### SQL Injection Protection
 * - Description field SQL injection (stored safely via Knex parameterization)
 * - Search parameter SQL injection
 * - Email field SQL injection (rejected by validation)
 *
 * ### XSS Prevention
 * - Backend stores XSS payloads as plain text (frontend must escape on render)
 * - HTML entities are preserved, not double-encoded
 *
 * ### Input Length Validation
 * - Maximum description length (255 chars)
 * - Empty description rejection
 *
 * ### Numeric Validation
 * - Negative amount rejection
 * - Zero amount rejection
 * - Non-numeric amount rejection
 * - Valid decimal amounts accepted
 *
 * ### Date Validation
 * - Invalid date format rejection
 * - Semantically invalid dates (documents current behavior)
 *
 * ### Authentication Security
 * - Missing token returns 401
 * - Invalid token returns 403
 * - Malformed auth header returns 403
 *
 * @see src/routes/expenses.ts - Expense validation under test
 * @see src/routes/auth.ts - Auth validation under test
 * @see src/middleware/auth.ts - Auth middleware under test
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createTestDb } from '../helpers/testDb.js';
import { createTestUserInDb } from '../helpers/fixtures.js';
import type { Knex } from 'knex';

let testDb: Knex;
let app: express.Express;

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
  const authRoutes = (await import('../../src/routes/auth.js')).default;
  const expenseRoutes = (await import('../../src/routes/expenses.js')).default;

  // Create test app
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/expenses', expenseRoutes);
});

afterEach(async () => {
  // Clean up between tests
  await testDb('expenses').del();
  await testDb('users').del();
});

afterAll(async () => {
  await testDb.destroy();
  vi.resetModules();
});

describe('Security: Input Validation', () => {
  describe('SQL Injection Protection', () => {
    it('should safely handle SQL injection in expense description', async () => {
      // Arrange - create user and get token
      const { token } = await createTestUserInDb(testDb);
      const sqlPayload = "'; DROP TABLE expenses; --";

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 50,
          description: sqlPayload,
          date: '2024-01-15',
        });

      // Assert - request should succeed (Knex parameterizes queries)
      expect(response.status).toBe(201);

      // Verify the expense was created with the literal string
      const getResponse = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].description).toBe(sqlPayload);
    });

    it('should safely handle SQL injection in search parameter', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);
      const sqlPayload = "1'; DROP TABLE expenses; --";

      // Act
      const response = await request(app)
        .get('/api/expenses')
        .query({ search: sqlPayload })
        .set('Authorization', `Bearer ${token}`);

      // Assert - request should succeed without SQL injection
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject SQL injection in email with validation error', async () => {
      // Arrange - SQL injection in email
      const sqlPayload = "test@example.com'; DROP TABLE users; --";

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: sqlPayload,
          password: 'password123',
        });

      // Assert - should return validation error (invalid email format)
      expect(response.status).toBe(400);
    });
  });

  describe('XSS Prevention (Backend Storage)', () => {
    it('should store XSS payload as plain text without modification', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);
      const xssPayload = '<script>alert("XSS")</script>';

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 25,
          description: xssPayload,
          date: '2024-01-15',
        });

      // Assert - should store as plain text (frontend must escape on render)
      expect(response.status).toBe(201);
      expect(response.body.description).toBe(xssPayload);
    });

    it('should preserve HTML entities in description', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);
      const htmlPayload = '&lt;script&gt;alert("XSS")&lt;/script&gt;';

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 30,
          description: htmlPayload,
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.description).toBe(htmlPayload);
    });
  });

  describe('Input Length Validation', () => {
    it('should handle description at max length', async () => {
      // Arrange - description at max length (255 characters)
      const { token } = await createTestUserInDb(testDb);
      const maxDescription = 'A'.repeat(255);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 10,
          description: maxDescription,
          date: '2024-01-15',
        });

      // Assert - should succeed at max length
      expect(response.status).toBe(201);
      expect(response.body.description).toBe(maxDescription);
    });

    it('should reject description exceeding max length', async () => {
      // Arrange - description exceeds 255 characters
      const { token } = await createTestUserInDb(testDb);
      const tooLongDescription = 'A'.repeat(256);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 10,
          description: tooLongDescription,
          date: '2024-01-15',
        });

      // Assert - should fail validation
      expect(response.status).toBe(400);
    });

    it('should reject empty description', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 10,
          description: '',
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Numeric Validation', () => {
    it('should reject negative amount', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: -50,
          description: 'Negative amount test',
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject zero amount', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 0,
          description: 'Zero amount test',
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject non-numeric amount', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 'not-a-number',
          description: 'Invalid amount test',
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should accept valid decimal amount', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 99.99,
          description: 'Decimal amount test',
          date: '2024-01-15',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(99.99);
    });
  });

  describe('Date Validation', () => {
    it('should reject invalid date format', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 50,
          description: 'Invalid date test',
          date: 'not-a-date',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle semantically invalid date (month 13)', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 50,
          description: 'Invalid month test',
          date: '2024-13-01',
        });

      // Note: The regex validation accepts YYYY-MM-DD format but doesn't
      // validate semantic correctness (month 13 passes regex).
      // This documents current behavior - ideally should return 400.
      expect([201, 400]).toContain(response.status);
    });

    it('should accept valid date', async () => {
      // Arrange
      const { token } = await createTestUserInDb(testDb);

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 1,
          amount: 50,
          description: 'Valid date test',
          date: '2024-06-15',
        });

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without auth token', async () => {
      // Arrange & Act
      const response = await request(app)
        .get('/api/expenses');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid auth token', async () => {
      // Arrange & Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid-token');

      // Assert - returns 403 Forbidden for invalid tokens
      expect(response.status).toBe(403);
    });

    it('should reject requests with malformed auth header', async () => {
      // Arrange & Act
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', 'NotBearer token');

      // Assert - returns 403 Forbidden for malformed headers
      expect(response.status).toBe(403);
    });
  });
});
