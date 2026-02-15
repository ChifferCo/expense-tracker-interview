/**
 * @fileoverview Unit tests for Login component
 * Tests login form, register mode, validation, loading states, and error handling
 *
 * @see src/pages/Login.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../../src/pages/Login';

describe('Login Component', () => {
  const defaultProps = {
    onLogin: vi.fn(),
    onRegister: vi.fn(),
    loginError: null,
    registerError: null,
    isLoginPending: false,
    isRegisterPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Mode (default)', () => {
    it('should render login form by default', () => {
      // Arrange - use default props

      // Act
      render(<Login {...defaultProps} />);

      // Assert
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('should display demo credentials hint', () => {
      // Arrange - use default props

      // Act
      render(<Login {...defaultProps} />);

      // Assert
      expect(screen.getByText(/demo@example.com/)).toBeInTheDocument();
    });

    it('should call onLogin with email and password on submit', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Act
      await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      // Assert
      expect(defaultProps.onLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should disable submit button when login is pending', () => {
      // Arrange - pass isLoginPending as true

      // Act
      render(<Login {...defaultProps} isLoginPending={true} />);

      // Assert
      const submitButton = screen.getByRole('button', { name: /loading/i });
      expect(submitButton).toBeDisabled();
    });

    it('should display login error message', () => {
      // Arrange
      const loginError = new Error('Invalid credentials');

      // Act
      render(<Login {...defaultProps} loginError={loginError} />);

      // Assert
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  describe('Register Mode', () => {
    it('should switch to register mode when clicking Register link', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Act
      await user.click(screen.getByText('Register'));

      // Assert
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    });

    it('should hide demo credentials in register mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Act
      await user.click(screen.getByText('Register'));

      // Assert
      expect(screen.queryByText(/demo@example.com/)).not.toBeInTheDocument();
    });

    it('should call onRegister with email and password on submit', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);
      await user.click(screen.getByText('Register'));

      // Act
      await user.type(screen.getByPlaceholderText('Email address'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'newpassword');
      await user.click(screen.getByRole('button', { name: 'Register' }));

      // Assert
      expect(defaultProps.onRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword',
      });
    });

    it('should display register error message', async () => {
      // Arrange
      const user = userEvent.setup();
      const registerError = new Error('Email already exists');
      render(<Login {...defaultProps} registerError={registerError} />);

      // Act
      await user.click(screen.getByText('Register'));

      // Assert
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('should disable submit button when register is pending', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} isRegisterPending={true} />);

      // Act
      await user.click(screen.getByText('Register'));

      // Assert
      const submitButton = screen.getByRole('button', { name: /loading/i });
      expect(submitButton).toBeDisabled();
    });

    it('should switch back to login mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Act - switch to register then back to login
      await user.click(screen.getByText('Register'));
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      await user.click(screen.getByText('Sign in'));

      // Assert
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should have required email field', () => {
      // Arrange & Act
      render(<Login {...defaultProps} />);

      // Assert
      const emailInput = screen.getByPlaceholderText('Email address');
      expect(emailInput).toBeRequired();
    });

    it('should have required password field', () => {
      // Arrange & Act
      render(<Login {...defaultProps} />);

      // Assert
      const passwordInput = screen.getByPlaceholderText('Password');
      expect(passwordInput).toBeRequired();
    });

    it('should have email input type', () => {
      // Arrange & Act
      render(<Login {...defaultProps} />);

      // Assert
      const emailInput = screen.getByPlaceholderText('Email address');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input type', () => {
      // Arrange & Act
      render(<Login {...defaultProps} />);

      // Assert
      const passwordInput = screen.getByPlaceholderText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
