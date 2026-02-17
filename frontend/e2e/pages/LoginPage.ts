import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  get headingSignIn() {
    return this.page.getByTestId('login-heading').filter({ hasText: /sign in to your account/i });
  }

  get headingCreateAccount() {
    return this.page.getByTestId('login-heading').filter({ hasText: /create your account/i });
  }

  get emailInput() {
    return this.page.getByTestId('login-email');
  }

  get passwordInput() {
    return this.page.getByTestId('login-password');
  }

  get submitSignInButton() {
    return this.page.getByTestId('login-submit-signin');
  }

  get toggleRegisterButton() {
    return this.page.getByTestId('login-toggle-mode');
  }

  get submitRegisterButton() {
    return this.page.getByTestId('login-submit-register');
  }

  get errorMessage() {
    return this.page.getByTestId('login-error');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitSignInButton.click();
  }

  async register(email: string, password: string) {
    await this.toggleRegisterButton.click();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitRegisterButton.click();
  }

  async switchToRegisterMode() {
    await this.toggleRegisterButton.click();
  }

  async switchToSignInMode() {
    await this.page.getByTestId('login-toggle-mode').click();
  }

  async expectSignInFormVisible() {
    await this.headingSignIn.waitFor({ state: 'visible' });
  }

  async expectCreateAccountFormVisible() {
    await this.headingCreateAccount.waitFor({ state: 'visible' });
  }
}
