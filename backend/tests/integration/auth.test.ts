/**
 * @fileoverview Integration tests for Auth API endpoints
 * Tests user registration and login with real database operations
 *
 * @see src/routes/auth.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createTestDb } from '../helpers/testDb.js';
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

  // Create test app
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterEach(async () => {
  // Clean up users between tests
  await testDb('users').del();
});

afterAll(async () => {
  await testDb.destroy();
  vi.resetModules();
});

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 409 for duplicate email', async () => {
      // Arrange - register first user
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      // Act - try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'differentpassword' });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidData = { email: 'not-an-email', password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should return 400 for password too short', async () => {
      // Arrange
      const invalidData = { email: 'test@example.com', password: '12345' };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      const invalidData = { password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      const invalidData = { email: 'test@example.com' };

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user before login tests
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });
    });

    it('should login successfully with correct credentials', async () => {
      // Arrange
      const credentials = { email: 'test@example.com', password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid password', async () => {
      // Arrange
      const invalidCredentials = { email: 'test@example.com', password: 'wrongpassword' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      // Arrange
      const nonExistentUser = { email: 'nonexistent@example.com', password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(nonExistentUser);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidEmail = { email: 'not-an-email', password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidEmail);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      const missingEmail = { password: 'password123' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(missingEmail);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      const missingPassword = { email: 'test@example.com' };

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send(missingPassword);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
