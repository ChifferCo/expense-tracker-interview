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
