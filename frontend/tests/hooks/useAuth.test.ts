import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';
import * as authApi from '../../src/api/auth';
import { renderHookWithQueryClient } from '../utils/test-utils';
import type { User, AuthResponse } from '../../src/types';

// Mock the auth API
vi.mock('../../src/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

describe('useAuth', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'test-token-123',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should initialize with unauthenticated state when no token/user in localStorage', () => {
      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with authenticated state when token and user exist in localStorage', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', 'invalid-json');

      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing user when token exists', () => {
      localStorage.setItem('token', 'test-token');

      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should call login API and update state on success', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.isLoginPending).toBe(false);
      expect(result.current.loginError).toBeNull();

      result.current.login({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isLoginPending).toBe(false);
      });

      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authApi.login).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useAuth());

      result.current.login({ email: 'test@example.com', password: 'wrong' });

      await waitFor(() => {
        expect(result.current.isLoginPending).toBe(false);
      });

      expect(result.current.loginError).toEqual(error);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set isLoginPending during login', async () => {
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const { result } = renderHookWithQueryClient(() => useAuth());

      result.current.login({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isLoginPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isLoginPending).toBe(false);
      });
    });
  });

  describe('register', () => {
    it('should call register API and update state on success', async () => {
      vi.mocked(authApi.register).mockResolvedValue(mockAuthResponse);

      const { result } = renderHookWithQueryClient(() => useAuth());

      result.current.register({ email: 'new@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isRegisterPending).toBe(false);
      });

      expect(authApi.register).toHaveBeenCalledWith('new@example.com', 'password123');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle register error', async () => {
      const error = new Error('Email already exists');
      vi.mocked(authApi.register).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useAuth());

      result.current.register({ email: 'existing@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isRegisterPending).toBe(false);
      });

      expect(result.current.registerError).toEqual(error);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set isRegisterPending during registration', async () => {
      vi.mocked(authApi.register).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAuthResponse), 100))
      );

      const { result } = renderHookWithQueryClient(() => useAuth());

      result.current.register({ email: 'new@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isRegisterPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isRegisterPending).toBe(false);
      });
    });
  });

  describe('logout', () => {
    it('should call logout API and clear state', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHookWithQueryClient(() => useAuth());

      // Wait for initial state to load
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      result.current.logout();

      expect(authApi.logout).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear state even when not authenticated', () => {
      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);

      result.current.logout();

      expect(authApi.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('loginError');
      expect(result.current).toHaveProperty('registerError');
      expect(result.current).toHaveProperty('isLoginPending');
      expect(result.current).toHaveProperty('isRegisterPending');
    });

    it('should have login and register as functions', () => {
      const { result } = renderHookWithQueryClient(() => useAuth());

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });
  });
});
