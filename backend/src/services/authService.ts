import bcrypt from 'bcryptjs';
import db from '../db/knex.js';
import { generateToken } from '../middleware/auth.js';
import type { User } from '../types/index.js';

interface RegisterParams {
  email: string;
  password: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface AuthResult {
  user: { id: number; email: string };
  token: string;
}

export async function register({ email, password }: RegisterParams): Promise<AuthResult> {
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [id] = await db('users').insert({ email, passwordHash });

  const token = generateToken({ userId: id, email });
  return { user: { id, email }, token };
}

export async function login({ email, password }: LoginParams): Promise<AuthResult> {
  const user = await db('users').where({ email }).first<User>();
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken({ userId: user.id, email: user.email });
  return { user: { id: user.id, email: user.email }, token };
}
