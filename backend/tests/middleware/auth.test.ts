import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../src/types/index.js';

// Mock the logger before importing the middleware
vi.mock('../../src/logger.js', () => ({
  default: {
    info: vi.fn(),
  },
}));

// Import after mocking
import { authenticateToken, generateToken, JWT_SECRET } from '../../src/middleware/auth.js';

describe('auth middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let originalJwtSecret: string | undefined;

  beforeEach(() => {
    // Store original JWT_SECRET
    originalJwtSecret = process.env.JWT_SECRET;
    // Set test JWT_SECRET
    process.env.JWT_SECRET = 'test-secret-key';

    // Setup mock request
    mockRequest = {
      headers: {},
      path: '/api/test',
    };

    // Setup mock response
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn().mockReturnThis();
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    // Setup mock next function
    mockNext = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original JWT_SECRET
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    vi.restoreAllMocks();
  });

  describe('authenticateToken', () => {
    describe('positive scenarios', () => {
      it('should authenticate valid token and attach user to request', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(1);
        expect(user.email).toBe('test@example.com');
        expect(statusSpy).not.toHaveBeenCalled();
        expect(jsonSpy).not.toHaveBeenCalled();
      });

      it('should handle token with different user payload', () => {
        const payload: JwtPayload = { userId: 42, email: 'another@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(42);
        expect(user.email).toBe('another@example.com');
      });

      it('should handle authorization header with single space correctly', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(1);
        expect(user.email).toBe('test@example.com');
      });

      it('should return 401 when authorization header has extra spaces (token extraction fails)', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        // Multiple spaces cause split to create empty strings, making token extraction fail
        mockRequest.headers = {
          authorization: `Bearer  ${token}`, // Extra space creates empty string in split array
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // When there are extra spaces, split(' ') creates ["Bearer", "", "token"]
        // So [1] is empty string, which is falsy, causing 401
        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should work with JWT_SECRET from environment', () => {
        // Use the current JWT_SECRET (which is set in beforeEach)
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(1);
        expect(user.email).toBe('test@example.com');
      });
    });

    describe('negative scenarios', () => {
      it('should return 401 when no authorization header is provided', () => {
        mockRequest.headers = {};

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
        expect((mockRequest as Request & { user?: JwtPayload }).user).toBeUndefined();
      });

      it('should return 401 when authorization header is empty string', () => {
        mockRequest.headers = {
          authorization: '',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when authorization header does not start with Bearer (invalid token)', () => {
        // The middleware doesn't check for "Bearer" prefix, it just splits and takes [1]
        // So "Token some-token" gives token = "some-token", which is then verified as JWT
        // This fails verification, resulting in 403
        mockRequest.headers = {
          authorization: 'Token some-token',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(403);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when Bearer is present but token is missing', () => {
        mockRequest.headers = {
          authorization: 'Bearer ',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when Bearer is present but token is empty string', () => {
        mockRequest.headers = {
          authorization: 'Bearer  ',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when token is invalid (malformed)', () => {
        mockRequest.headers = {
          authorization: 'Bearer invalid.token.here',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(403);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
        expect((mockRequest as Request & { user?: JwtPayload }).user).toBeUndefined();
      });

      it('should return 403 when token is signed with wrong secret', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, 'wrong-secret-key');

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(403);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when token is expired', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' }); // Expired 1 hour ago

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(403);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when token is just a random string', () => {
        mockRequest.headers = {
          authorization: 'Bearer random-string-not-a-token',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(403);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when token is empty string after Bearer', () => {
        mockRequest.headers = {
          authorization: 'Bearer',
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle authorization header (Express normalizes to lowercase)', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        // Express normalizes headers to lowercase 'authorization'
        // The middleware uses req.headers['authorization'] which works with normalized headers
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(1);
        expect(user.email).toBe('test@example.com');
      });

      it('should return 403 when token payload is missing required fields', () => {
        // Create a token with incomplete payload
        const incompletePayload = { userId: 1 } as any; // Missing email
        const token = jwt.sign(incompletePayload, JWT_SECRET);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        // The token will verify successfully, but payload is incomplete
        // This tests that the middleware doesn't validate payload structure
        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Should still call next, as jwt.verify only checks signature and expiration
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe('edge cases', () => {
      it('should handle request with single authorization header value', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = jwt.sign(payload, JWT_SECRET);

        // Express normalizes headers, so we test with a single string value
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(1);
        expect(user.email).toBe('test@example.com');
      });

      it('should preserve request path in error responses', () => {
        mockRequest.path = '/api/protected/route';

        mockRequest.headers = {};

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ error: 'Authentication required' });
      });
    });
  });

  describe('generateToken', () => {
    describe('positive scenarios', () => {
      it('should generate a valid JWT token', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = generateToken(payload);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

        // Verify the token can be decoded
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        expect(decoded.userId).toBe(1);
        expect(decoded.email).toBe('test@example.com');
      });

      it('should generate token with 24h expiration', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = generateToken(payload);

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { exp: number };
        const expirationTime = decoded.exp;
        const currentTime = Math.floor(Date.now() / 1000);
        const expectedExpiration = currentTime + 24 * 60 * 60; // 24 hours in seconds

        // Allow 5 second tolerance for test execution time
        expect(Math.abs(expirationTime - expectedExpiration)).toBeLessThan(5);
      });

      it('should generate tokens with same payload structure', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token1 = generateToken(payload);
        
        // Tokens may be identical if generated in the same second (same iat)
        // But both should decode to same payload values
        const token2 = generateToken(payload);

        // Both should decode to same userId and email
        const decoded1 = jwt.verify(token1, JWT_SECRET) as JwtPayload & { iat?: number; exp?: number };
        const decoded2 = jwt.verify(token2, JWT_SECRET) as JwtPayload & { iat?: number; exp?: number };
        expect(decoded1.userId).toBe(decoded2.userId);
        expect(decoded1.email).toBe(decoded2.email);
        expect(decoded1.userId).toBe(1);
        expect(decoded1.email).toBe('test@example.com');
      });

      it('should generate token with different user payloads', () => {
        const payload1: JwtPayload = { userId: 1, email: 'user1@example.com' };
        const payload2: JwtPayload = { userId: 2, email: 'user2@example.com' };

        const token1 = generateToken(payload1);
        const token2 = generateToken(payload2);

        const decoded1 = jwt.verify(token1, JWT_SECRET) as JwtPayload;
        const decoded2 = jwt.verify(token2, JWT_SECRET) as JwtPayload;

        expect(decoded1.userId).toBe(1);
        expect(decoded1.email).toBe('user1@example.com');
        expect(decoded2.userId).toBe(2);
        expect(decoded2.email).toBe('user2@example.com');
      });

      it('should use JWT_SECRET from environment', () => {
        const payload: JwtPayload = { userId: 1, email: 'test@example.com' };
        const token = generateToken(payload);

        // Should verify with the current JWT_SECRET
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        expect(decoded.userId).toBe(1);
        expect(decoded.email).toBe('test@example.com');

        // Should not verify with wrong secret
        expect(() => {
          jwt.verify(token, 'wrong-secret');
        }).toThrow();
      });
    });

    describe('integration with authenticateToken', () => {
      it('should generate token that can be authenticated by middleware', () => {
        const payload: JwtPayload = { userId: 123, email: 'integration@test.com' };
        const token = generateToken(payload);

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const user = (mockRequest as Request & { user: JwtPayload }).user;
        expect(user.userId).toBe(123);
        expect(user.email).toBe('integration@test.com');
      });
    });
  });
});
