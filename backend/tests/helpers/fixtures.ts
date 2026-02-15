/**
 * @fileoverview Test fixtures and factory functions for backend tests
 *
 * Provides helper functions to create test users, expenses, and auth tokens.
 * These fixtures follow the factory pattern for flexible test data creation.
 *
 * ## Key Functions
 * - `createTestUser()` - Creates user with shared test db instance
 * - `createTestUserInDb(db)` - Creates user with custom db instance (for integration tests)
 * - `createTestExpense(userId)` - Creates expense for a user
 * - `getAuthHeaders(token)` - Returns properly formatted auth headers
 *
 * @example
 * // Create a user and get auth token
 * const { user, token } = await createTestUserInDb(testDb);
 *
 * // Use token in API requests
 * const response = await request(app)
 *   .get('/api/expenses')
 *   .set('Authorization', `Bearer ${token}`);
 *
 * @see tests/integration/security.test.ts - Example usage in integration tests
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getTestDb } from './testDb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface UserOverrides {
  email?: string;
  password?: string;
}

interface ExpenseOverrides {
  categoryId?: number;
  amount?: number;
  description?: string;
  date?: string;
}

export async function createTestUser(overrides: UserOverrides = {}) {
  const db = getTestDb();
  return createTestUserInDb(db, overrides);
}

/**
 * Create a test user with a specific database instance
 * Use this in integration tests that manage their own db connection
 */
export async function createTestUserInDb(db: ReturnType<typeof getTestDb>, overrides: UserOverrides = {}) {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const password = overrides.password || 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const [id] = await db('users').insert({
    email,
    passwordHash: hashedPassword,
  });

  const user = await db('users').where({ id }).first();
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '24h' });

  return {
    user: { id: user.id, email: user.email },
    token,
    password, // Return plain password for login tests
  };
}

export async function createTestExpense(userId: number, overrides: ExpenseOverrides = {}) {
  const db = getTestDb();

  const expense = {
    userId,
    categoryId: overrides.categoryId || 1,
    amount: overrides.amount || 50.00,
    description: overrides.description || 'Test expense',
    date: overrides.date || new Date().toISOString().split('T')[0],
  };

  const [id] = await db('expenses').insert(expense);
  const created = await db('expenses').where({ id }).first();

  return created;
}

export function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createMultipleExpenses(userId: number, count: number) {
  const expenses = [];
  for (let i = 0; i < count; i++) {
    const expense = await createTestExpense(userId, {
      description: `Test expense ${i + 1}`,
      amount: (i + 1) * 10,
    });
    expenses.push(expense);
  }
  return expenses;
}
