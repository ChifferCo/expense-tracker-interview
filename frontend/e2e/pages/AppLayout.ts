import type { Page } from '@playwright/test';

/**
 * Shared layout for authenticated pages: nav links and logout.
 */
export class AppLayout {
  constructor(private readonly page: Page) {}

  get linkDashboard() {
    return this.page.getByTestId('nav-link-dashboard');
  }

  get linkExpenses() {
    return this.page.getByTestId('nav-link-expenses');
  }

  get linkImport() {
    return this.page.getByTestId('nav-link-import');
  }

  get logoutButton() {
    return this.page.getByTestId('nav-logout');
  }

  get appTitle() {
    return this.page.getByTestId('app-title');
  }

  async goToDashboard() {
    await this.linkDashboard.click();
  }

  async goToExpenses() {
    await this.linkExpenses.click();
  }

  async goToImport() {
    await this.linkImport.click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
