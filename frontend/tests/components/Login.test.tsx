/**
 * @fileoverview Unit tests for Login component
 *
 * Tests the Login component which handles both login and registration flows.
 * All tests follow the AAA (Arrange-Act-Assert) pattern using React Testing Library.
 *
 * ## Test Coverage (15 tests)
 *
 * ### Login Mode (Default)
 * - Renders login form with email, password, submit button
 * - Displays demo credentials hint
 * - Calls onLogin with credentials on submit
 * - Disables submit button when loading
 * - Displays error messages
 *
 * ### Register Mode
 * - Switches to register mode via link
 * - Hides demo credentials in register mode
 * - Calls onRegister with credentials on submit
 * - Displays register-specific error messages
 * - Disables submit button when loading
 * - Switches back to login mode
 *
 * ### Form Validation
 * - Email field is required
 * - Password field is required
 * - Email input has type="email"
 * - Password input has type="password"
 *
 * ## Props Interface
 * - onLogin: (credentials) => void
 * - onRegister: (credentials) => void
 * - loginError: Error | null
 * - registerError: Error | null
 * - isLoginPending: boolean
 * - isRegisterPending: boolean
 *
 * @see src/pages/Login.tsx - Component under test
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

  describe('SEC-002: Demo Credentials Exposure', () => {
    /**
     * SECURITY CONCERN: Demo credentials are displayed on the login page.
     * While this is intentional for demo purposes, it's worth documenting
     * that credentials should never be exposed in production.
     */
    it('should display demo credentials on login page (intentional for demo)', () => {
      // Arrange & Act
      render(<Login {...defaultProps} />);

      // Assert - demo email is visible (this is intentional for the demo)
      expect(screen.getByText(/demo@example.com/)).toBeInTheDocument();

      // Document: In production, credentials should NEVER be displayed
      // This test passes but serves as documentation of the security consideration
    });

    it('should NOT expose password in login page (security concern)', () => {
      // Arrange & Act
      const { container } = render(<Login {...defaultProps} />);

      // Assert - password should NOT be visible in rendered HTML
      // NOTE: This is a SECURITY CONCERN - passwords should never be displayed
      const htmlContent = container.innerHTML;

      // This test FAILS until the security concern is addressed
      // In production, credentials should NEVER be displayed
      expect(htmlContent).not.toContain('password123');
    });

    it('should hide demo credentials in register mode', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Act - switch to register mode
      await user.click(screen.getByText('Register'));

      // Assert - demo credentials should not be visible in register mode
      expect(screen.queryByText(/demo@example.com/)).not.toBeInTheDocument();
    });
  });
});
