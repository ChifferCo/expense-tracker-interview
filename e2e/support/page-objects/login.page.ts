/**
 * @fileoverview Login Page Object
 *
 * Encapsulates all interactions with the login/registration page.
 * Provides clean, reusable methods for authentication flows.
 */

import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  get emailInput() {
    return this.page.getByPlaceholder('Email address');
  }

  get passwordInput() {
    return this.page.getByPlaceholder('Password');
  }

  get signInButton() {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  get registerButton() {
    return this.page.getByRole('button', { name: 'Register' });
  }

  get signInLink() {
    return this.page.getByText('Sign in');
  }

  get registerLink() {
    return this.page.getByText('Register');
  }

  get signInHeading() {
    return this.page.getByText('Sign in to your account');
  }

  get createAccountHeading() {
    return this.page.getByText('Create your account');
  }

  get demoCredentialsHint() {
    return this.page.getByText('demo@example.com');
  }

  get errorMessage() {
    return this.page.locator('text=/error|invalid|failed/i');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to the login page.
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Fill in login credentials.
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form.
   */
  async submitLogin() {
    await this.signInButton.click();
  }

  /**
   * Complete login flow with given credentials.
   * @param email - User email
   * @param password - User password
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submitLogin();
  }

  /**
   * Login with demo credentials.
   */
  async loginAsDemo() {
    await this.login('demo@example.com', 'password123');
  }

  /**
   * Switch to registration mode.
   */
  async switchToRegister() {
    await this.registerLink.click();
  }

  /**
   * Switch back to login mode.
   */
  async switchToLogin() {
    await this.signInLink.click();
  }

  /**
   * Complete registration flow.
   * @param email - User email
   * @param password - User password
   */
  async register(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.registerButton.click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assert login form is visible.
   */
  async expectLoginFormVisible() {
    await expect(this.signInHeading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  /**
   * Assert registration form is visible.
   */
  async expectRegisterFormVisible() {
    await expect(this.createAccountHeading).toBeVisible();
    await expect(this.registerButton).toBeVisible();
  }

  /**
   * Assert demo credentials hint is visible.
   */
  async expectDemoHintVisible() {
    await expect(this.demoCredentialsHint).toBeVisible();
  }

  /**
   * Assert demo credentials hint is not visible.
   */
  async expectDemoHintNotVisible() {
    await expect(this.demoCredentialsHint).not.toBeVisible();
  }

  /**
   * Assert error message is visible.
   */
  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }
}
