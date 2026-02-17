import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import type { User } from '../../src/types/index.js';

// Use vi.hoisted() to define mocks that can be used in vi.mock() factories
const { mockWhere, mockFirst, mockInsert, mockDb } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFirst = vi.fn();
  const mockInsert = vi.fn();

  // Make where() return an object with first() method (chainable)
  mockWhere.mockReturnValue({
    first: mockFirst,
  });

  // Create a mock function that returns a query builder when called with table name
  const mockDb = vi.fn(() => ({
    where: mockWhere,
    first: mockFirst,
    insert: mockInsert,
  }));

  return { mockWhere, mockFirst, mockInsert, mockDb };
});

// Mock dependencies before importing the service
vi.mock('../../src/db/knex.js', () => ({
  default: mockDb,
}));

vi.mock('../../src/middleware/auth.js', () => ({
  generateToken: vi.fn(),
}));

// Import after mocking
import { generateToken } from '../../src/middleware/auth.js';
import { register, login } from '../../src/services/authService.js';

describe('authService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset query builder chain - where() returns object with first()
    mockWhere.mockReturnValue({
      first: mockFirst,
    });

    // Reset insert to return promise by default
    mockInsert.mockResolvedValue([1]);

    // Mock bcrypt functions
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    describe('positive scenarios', () => {
      it('should successfully register a new user', async () => {
        const email = 'newuser@example.com';
        const password = 'password123';

        // Mock: no existing user
        mockFirst.mockResolvedValueOnce(undefined);
        // Mock: insert returns [userId]
        mockInsert.mockResolvedValueOnce([1]);
        // Mock: generateToken returns a token
        vi.mocked(generateToken).mockReturnValueOnce('mock-jwt-token');

        const result = await register({ email, password });

        expect(result).toEqual({
          user: { id: 1, email },
          token: 'mock-jwt-token',
        });

        // Verify database calls
        expect(mockDb).toHaveBeenCalledWith('users');
        expect(mockWhere).toHaveBeenCalledWith({ email });
        expect(mockFirst).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        expect(mockInsert).toHaveBeenCalledWith({
          email,
          passwordHash: 'hashed-password',
        });
        expect(generateToken).toHaveBeenCalledWith({
          userId: 1,
          email,
        });
      });

      it('should hash password before storing', async () => {
        const email = 'user@example.com';
        const password = 'securePassword123';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([42]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await register({ email, password });

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        expect(mockInsert).toHaveBeenCalledWith({
          email,
          passwordHash: 'hashed-password',
        });
      });

      it('should generate token with correct user data', async () => {
        const email = 'tokenuser@example.com';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([99]);
        vi.mocked(generateToken).mockReturnValueOnce('generated-token');

        const result = await register({ email, password });

        expect(generateToken).toHaveBeenCalledWith({
          userId: 99,
          email,
        });
        expect(result.token).toBe('generated-token');
      });

      it('should handle different email formats', async () => {
        const email = 'user+tag@example.co.uk';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([2]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await register({ email, password });

        expect(result.user.email).toBe(email);
        expect(mockWhere).toHaveBeenCalledWith({ email });
      });

      it('should handle long passwords', async () => {
        const email = 'user@example.com';
        const password = 'a'.repeat(200); // Very long password

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([3]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await register({ email, password });

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      });
    });

    describe('negative scenarios', () => {
      it('should throw error when email is already registered', async () => {
        const email = 'existing@example.com';
        const password = 'password123';

        const existingUser: User = {
          id: 1,
          email,
          passwordHash: 'existing-hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(existingUser);

        await expect(register({ email, password })).rejects.toThrow(
          'Email already registered'
        );

        // Should check for existing user
        expect(mockWhere).toHaveBeenCalledWith({ email });
        expect(mockFirst).toHaveBeenCalled();
        // Should not insert or hash password
        expect(mockInsert).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw error when database query fails during user check', async () => {
        const email = 'user@example.com';
        const password = 'password';

        const dbError = new Error('Database connection failed');
        mockFirst.mockRejectedValueOnce(dbError);

        await expect(register({ email, password })).rejects.toThrow(
          'Database connection failed'
        );

        expect(mockInsert).not.toHaveBeenCalled();
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      it('should throw error when password hashing fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        const hashError = new Error('Bcrypt hashing failed');
        vi.spyOn(bcrypt, 'hash').mockRejectedValueOnce(hashError);

        await expect(register({ email, password })).rejects.toThrow(
          'Bcrypt hashing failed'
        );

        // Should not insert into database
        expect(mockInsert).not.toHaveBeenCalled();
      });

      it('should throw error when database insert fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        const insertError = new Error('Insert failed: constraint violation');
        mockInsert.mockRejectedValueOnce(insertError);

        await expect(register({ email, password })).rejects.toThrow(
          'Insert failed: constraint violation'
        );

        expect(bcrypt.hash).toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw error when token generation fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([1]);
        const tokenError = new Error('Token generation failed');
        vi.mocked(generateToken).mockImplementationOnce(() => {
          throw tokenError;
        });

        await expect(register({ email, password })).rejects.toThrow(
          'Token generation failed'
        );

        // User should still be inserted (transaction would rollback in real scenario)
        expect(mockInsert).toHaveBeenCalled();
      });

      it('should handle case-sensitive email uniqueness check', async () => {
        const email = 'User@Example.com';
        const existingEmail = 'user@example.com';

        const existingUser: User = {
          id: 1,
          email: existingEmail,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        // SQLite is case-insensitive by default, but testing the behavior
        mockFirst.mockResolvedValueOnce(existingUser);

        await expect(
          register({ email, password: 'password' })
        ).rejects.toThrow('Email already registered');
      });
    });

    describe('edge cases', () => {
      it('should handle empty email string', async () => {
        const email = '';
        const password = 'password';

        // Empty email might pass validation but fail at DB level
        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([1]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        // This might succeed or fail depending on DB constraints
        // Testing that the function handles it
        const result = await register({ email, password });

        expect(result.user.email).toBe('');
      });

      it('should handle empty password string', async () => {
        const email = 'user@example.com';
        const password = '';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([1]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await register({ email, password });

        expect(bcrypt.hash).toHaveBeenCalledWith('', 10);
      });

      it('should handle special characters in email', async () => {
        const email = 'user+test.123@example-domain.co.uk';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([1]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await register({ email, password });

        expect(result.user.email).toBe(email);
      });

      it('should handle special characters in password', async () => {
        const email = 'user@example.com';
        const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        mockFirst.mockResolvedValueOnce(undefined);
        mockInsert.mockResolvedValueOnce([1]);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await register({ email, password });

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      });
    });
  });

  describe('login', () => {
    describe('positive scenarios', () => {
      it('should successfully login with correct credentials', async () => {
        const email = 'user@example.com';
        const password = 'correctPassword';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hashed-password',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
        vi.mocked(generateToken).mockReturnValueOnce('login-token');

        const result = await login({ email, password });

        expect(result).toEqual({
          user: { id: 1, email },
          token: 'login-token',
        });

        expect(mockDb).toHaveBeenCalledWith('users');
        expect(mockWhere).toHaveBeenCalledWith({ email });
        expect(mockFirst).toHaveBeenCalled();
        expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed-password');
        expect(generateToken).toHaveBeenCalledWith({
          userId: 1,
          email,
        });
      });

      it('should return user data without password hash', async () => {
        const email = 'user@example.com';
        const password = 'password';

        const user: User = {
          id: 42,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await login({ email, password });

        expect(result.user).toEqual({ id: 42, email });
        expect(result.user).not.toHaveProperty('passwordHash');
        expect(result.user).not.toHaveProperty('createdAt');
      });

      it('should generate token with correct user ID and email', async () => {
        const email = 'tokenuser@example.com';
        const password = 'password';

        const user: User = {
          id: 999,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.mocked(generateToken).mockReturnValueOnce('generated-token');

        const result = await login({ email, password });

        expect(generateToken).toHaveBeenCalledWith({
          userId: 999,
          email,
        });
        expect(result.token).toBe('generated-token');
      });

      it('should handle different email formats', async () => {
        const email = 'user+tag@subdomain.example.co.uk';
        const password = 'password';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await login({ email, password });

        expect(result.user.email).toBe(email);
        expect(mockWhere).toHaveBeenCalledWith({ email });
      });
    });

    describe('negative scenarios', () => {
      it('should throw error when user does not exist', async () => {
        const email = 'nonexistent@example.com';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );

        expect(mockWhere).toHaveBeenCalledWith({ email });
        expect(mockFirst).toHaveBeenCalledTimes(1);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw error when password is incorrect', async () => {
        const email = 'user@example.com';
        const password = 'wrongPassword';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'correct-hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(password, 'correct-hash');
        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw same error message for both wrong email and wrong password', async () => {
        const email = 'user@example.com';
        const password = 'password';

        // Test wrong email
        mockFirst.mockResolvedValueOnce(undefined);
        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );

        // Test wrong password
        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };
        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );
      });

      it('should throw error when database query fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        const dbError = new Error('Database query failed');
        mockFirst.mockRejectedValueOnce(dbError);

        await expect(login({ email, password })).rejects.toThrow(
          'Database query failed'
        );

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw error when password comparison fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        const compareError = new Error('Bcrypt compare failed');
        vi.spyOn(bcrypt, 'compare').mockRejectedValueOnce(compareError);

        await expect(login({ email, password })).rejects.toThrow(
          'Bcrypt compare failed'
        );

        expect(generateToken).not.toHaveBeenCalled();
      });

      it('should throw error when token generation fails', async () => {
        const email = 'user@example.com';
        const password = 'password';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        const tokenError = new Error('Token generation failed');
        vi.mocked(generateToken).mockImplementationOnce(() => {
          throw tokenError;
        });

        await expect(login({ email, password })).rejects.toThrow(
          'Token generation failed'
        );

        expect(bcrypt.compare).toHaveBeenCalled();
      });

      it('should handle case-sensitive email lookup', async () => {
        const email = 'User@Example.com';
        const password = 'password';

        // User exists with different case
        const user: User = {
          id: 1,
          email: 'user@example.com',
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        // SQLite is case-insensitive, but testing exact match behavior
        mockFirst.mockResolvedValueOnce(undefined);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty email string', async () => {
        const email = '';
        const password = 'password';

        mockFirst.mockResolvedValueOnce(undefined);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );
      });

      it('should handle empty password string', async () => {
        const email = 'user@example.com';
        const password = '';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        await expect(login({ email, password })).rejects.toThrow(
          'Invalid email or password'
        );

        expect(bcrypt.compare).toHaveBeenCalledWith('', 'hash');
      });

      it('should handle very long password', async () => {
        const email = 'user@example.com';
        const password = 'a'.repeat(1000);

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await login({ email, password });

        expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hash');
      });

      it('should handle user with special characters in email', async () => {
        const email = 'user+test.123@example-domain.co.uk';
        const password = 'password';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await login({ email, password });

        expect(result.user.email).toBe(email);
      });

      it('should handle password with special characters', async () => {
        const email = 'user@example.com';
        const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        await login({ email, password });

        expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hash');
      });

      it('should handle user with unicode characters in email', async () => {
        const email = 'üser@exämple.com';
        const password = 'password';

        const user: User = {
          id: 1,
          email,
          passwordHash: 'hash',
          createdAt: '2024-01-01T00:00:00Z',
        };

        mockFirst.mockResolvedValueOnce(user);
        vi.mocked(generateToken).mockReturnValueOnce('token');

        const result = await login({ email, password });

        expect(result.user.email).toBe(email);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should allow registering and then logging in with same credentials', async () => {
      const email = 'integration@example.com';
      const password = 'integrationPassword';

      // Register
      mockFirst.mockResolvedValueOnce(undefined);
      mockInsert.mockResolvedValueOnce([1]);
      vi.mocked(generateToken).mockReturnValueOnce('register-token');

      const registerResult = await register({ email, password });

      expect(registerResult.user.email).toBe(email);
      expect(registerResult.token).toBe('register-token');

      // Reset mocks for login
      vi.clearAllMocks();
      mockFirst.mockResolvedValueOnce({
        id: 1,
        email,
        passwordHash: 'hashed-password',
        createdAt: '2024-01-01T00:00:00Z',
      });
      vi.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
      vi.mocked(generateToken).mockReturnValueOnce('login-token');

      // Login
      const loginResult = await login({ email, password });

      expect(loginResult.user.email).toBe(email);
      expect(loginResult.token).toBe('login-token');
    });
  });
});
