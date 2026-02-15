/**
 * @fileoverview Unit tests for authService
 * Tests user registration and login functionality with mocked database
 *
 * @see src/services/authService.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock the db module before importing the service
vi.mock('../../../src/db/knex.js', () => {
  const mockDb: ReturnType<typeof vi.fn> & {
    where: ReturnType<typeof vi.fn>;
    first: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  } = Object.assign(vi.fn(), {
    where: vi.fn(),
    first: vi.fn(),
    insert: vi.fn(),
  });
  mockDb.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  return { default: mockDb };
});

// Mock the auth middleware
vi.mock('../../../src/middleware/auth.js', () => ({
  generateToken: vi.fn(() => 'mock-jwt-token'),
}));

import { register, login } from '../../../src/services/authService.js';
import db from '../../../src/db/knex.js';
import { generateToken } from '../../../src/middleware/auth.js';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null), // No existing user
        insert: vi.fn().mockResolvedValue([1]), // Return new user id
      });

      // Act
      const result = await register({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(result).toEqual({
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-jwt-token',
      });
      expect(generateToken).toHaveBeenCalledWith({ userId: 1, email: 'test@example.com' });
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }), // Existing user
      });

      // Act & Assert
      await expect(register({ email: 'test@example.com', password: 'password123' }))
        .rejects.toThrow('Email already registered');
    });

    it('should hash the password before storing', async () => {
      // Arrange
      const hashSpy = vi.spyOn(bcrypt, 'hash');
      const mockInsert = vi.fn().mockResolvedValue([1]);
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        insert: mockInsert,
      });

      // Act
      await register({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(hashSpy).toHaveBeenCalledWith('password123', 10);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          passwordHash: hashedPassword,
        }),
      });

      // Act
      const result = await login({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(result).toEqual({
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-jwt-token',
      });
      expect(generateToken).toHaveBeenCalledWith({ userId: 1, email: 'test@example.com' });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(login({ email: 'nonexistent@example.com', password: 'password123' }))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          passwordHash: hashedPassword,
        }),
      });

      // Act & Assert
      await expect(login({ email: 'test@example.com', password: 'wrongpassword' }))
        .rejects.toThrow('Invalid email or password');
    });

    it('should use bcrypt.compare to verify password', async () => {
      // Arrange
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockDb = db as unknown as ReturnType<typeof vi.fn>;
      mockDb.mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 1,
          email: 'test@example.com',
          passwordHash: hashedPassword,
        }),
      });

      // Act
      await login({ email: 'test@example.com', password: 'password123' });

      // Assert
      expect(compareSpy).toHaveBeenCalledWith('password123', hashedPassword);
    });
  });
});
