import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import db from '../../src/db/knex.js';
import app from '../../src/index.js';

const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

async function setupTestDb() {
  // Run migrations via CLI (supports TypeScript)
  execSync('npx knex migrate:latest --knexfile src/db/knexfile.ts', {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  // Clear in FK order
  await db('import_history').del();
  await db('import_sessions').del();
  await db('expenses').del();
  await db('users').del();
  await db('categories').del();

  // Seed categories
  await db('categories').insert([
    { id: 1, name: 'Food', icon: 'utensils' },
    { id: 2, name: 'Transport', icon: 'car' },
    { id: 3, name: 'Entertainment', icon: 'film' },
    { id: 4, name: 'Bills', icon: 'file-text' },
    { id: 5, name: 'Shopping', icon: 'shopping-bag' },
    { id: 6, name: 'Other', icon: 'more-horizontal' },
  ]);

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  await db('users').insert({
    id: 1,
    email: TEST_USER.email,
    passwordHash,
  });
}

describe('API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await setupTestDb();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Login', () => {
    it('should login with valid credentials and return user and token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({ id: 1, email: TEST_USER.email });
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');

      authToken = res.body.token;
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_USER.password })
        .expect(401);
    });

    it('should reject login with invalid input', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: TEST_USER.password })
        .expect(400);
    });
  });

  describe('Logout (verify protected routes require auth)', () => {
    it('should reject access to expenses without token', async () => {
      await request(app)
        .get('/api/expenses')
        .expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app)
        .get('/api/expenses')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });

    it('should allow access with valid token after login', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .expect(200);
    });
  });

  describe('Expenses CRUD', () => {
    let createdExpenseId: number;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      authToken = loginRes.body.token;
    });

    it('should create an expense', async () => {
      const expenseData = {
        categoryId: 1,
        amount: 29.99,
        description: 'Lunch at cafe',
        date: '2025-02-15',
      };

      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(201);

      expect(res.body).toMatchObject({
        categoryId: 1,
        amount: 29.99,
        description: 'Lunch at cafe',
        date: '2025-02-15',
        userId: 1,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('createdAt');

      createdExpenseId = res.body.id;
    });

    it('should list expenses', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const created = res.body.find((e: { id: number }) => e.id === createdExpenseId);
      expect(created).toBeDefined();
      expect(created).toMatchObject({
        description: 'Lunch at cafe',
        amount: 29.99,
        categoryName: 'Food',
      });
    });

    it('should get a single expense by id', async () => {
      const res = await request(app)
        .get(`/api/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: createdExpenseId,
        description: 'Lunch at cafe',
        amount: 29.99,
        categoryName: 'Food',
      });
    });

    it('should edit an expense', async () => {
      const res = await request(app)
        .put(`/api/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 35.5,
          description: 'Lunch at cafe (updated)',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: createdExpenseId,
        amount: 35.5,
        description: 'Lunch at cafe (updated)',
      });
    });

    it('should return 404 when editing non-existent expense', async () => {
      await request(app)
        .put('/api/expenses/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Does not exist' })
        .expect(404);
    });

    it('should delete an expense', async () => {
      await request(app)
        .delete(`/api/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 when getting deleted expense', async () => {
      await request(app)
        .get(`/api/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent expense', async () => {
      await request(app)
        .delete('/api/expenses/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject create expense with invalid input', async () => {
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: 1,
          amount: -10,
          description: 'Invalid amount',
          date: '2025-02-15',
        })
        .expect(400);
    });
  });

  describe('Import Expenses', () => {
    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      authToken = loginRes.body.token;
    });

    it('should upload CSV, save mapping, and import expenses', async () => {
      const csvContent = `Date,Amount,Description,Category
2025-02-10,15.50,Coffee,Food
2025-02-11,25.00,Gas station,Transport`;

      // Upload CSV (creates session automatically)
      const uploadRes = await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'expenses.csv',
          csvContent,
        })
        .expect(201);

      expect(uploadRes.body).toHaveProperty('session');
      expect(uploadRes.body).toHaveProperty('structure');
      expect(uploadRes.body.structure).toHaveProperty('headers');
      expect(uploadRes.body.structure).toHaveProperty('suggestedMapping');

      const sessionId = uploadRes.body.session.id;
      const mapping = uploadRes.body.structure.suggestedMapping;

      // Save column mapping
      await request(app)
        .post(`/api/import/session/${sessionId}/mapping`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          columnMapping: {
            date: mapping.date || 'Date',
            amount: mapping.amount || 'Amount',
            description: mapping.description || 'Description',
            category: mapping.category || 'Category',
          },
        })
        .expect(200);

      // Confirm import
      const confirmRes = await request(app)
        .post(`/api/import/session/${sessionId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(confirmRes.body).toMatchObject({
        importedCount: 2,
        skippedCount: 0,
      });
      expect(confirmRes.body).toHaveProperty('history');

      // Verify expenses were created
      const expensesRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const imported = expensesRes.body.filter(
        (e: { description: string }) =>
          e.description === 'Coffee' || e.description === 'Gas station'
      );
      expect(imported).toHaveLength(2);
    });

    it('should list import history', async () => {
      const res = await request(app)
        .get('/api/import/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toMatchObject({
        fileName: 'expenses.csv',
        importedRows: 2,
      });
    });

    it('should reject upload without auth', async () => {
      await request(app)
        .post('/api/import/upload')
        .send({
          fileName: 'test.csv',
          csvContent: 'Date,Amount\n2025-01-01,10',
        })
        .expect(401);
    });

    it('should reject upload with invalid CSV', async () => {
      await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'bad.csv',
          csvContent: 'header only - no data rows',
        })
        .expect(400);
    });
  });
});
