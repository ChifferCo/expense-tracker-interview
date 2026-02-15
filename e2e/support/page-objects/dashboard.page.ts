/**
 * @fileoverview Dashboard Page Object
 *
 * Encapsulates all interactions with the dashboard page.
 * Provides methods for navigation, stats verification, and recent expenses.
 */

import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  get heading() {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  get monthlySpendingStat() {
    return this.page.getByText(/Spending$/);
  }

  get totalExpensesStat() {
    return this.page.getByText('Total Expenses');
  }

  get avgPerExpenseStat() {
    return this.page.getByText('Avg per Expense');
  }

  get recentExpensesHeading() {
    return this.page.getByRole('heading', { name: 'Recent Expenses' });
  }

  get logoutButton() {
    return this.page.getByRole('button', { name: /logout/i });
  }

  get appTitle() {
    return this.page.getByText('ExpenseTracker');
  }

  // Navigation links
  get dashboardLink() {
    return this.page.getByRole('link', { name: /dashboard/i });
  }

  get expensesLink() {
    return this.page.getByRole('link', { name: /expenses/i });
  }

  get importLink() {
    return this.page.getByRole('link', { name: /import/i });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to the dashboard page.
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Navigate to expenses page via sidebar link.
   */
  async navigateToExpenses() {
    await this.expensesLink.click();
    await expect(this.page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  }

  /**
   * Navigate to import page via sidebar link.
   */
  async navigateToImport() {
    await this.importLink.click();
    await expect(this.page.getByRole('heading', { name: 'Import Expenses', level: 1 })).toBeVisible();
  }

  /**
   * Click logout button.
   */
  async logout() {
    await this.logoutButton.click();
  }

  /**
   * Get expense item by description text.
   */
  getExpenseItem(description: string) {
    return this.page.locator('li', { hasText: description });
  }

  /**
   * Click delete button on an expense in recent expenses list.
   */
  async clickDeleteOnExpense(description: string) {
    const item = this.getExpenseItem(description);
    await item.getByRole('button', { name: 'Delete' }).click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assert dashboard is loaded and visible.
   */
  async expectLoaded(timeout = 10000) {
    await expect(this.heading).toBeVisible({ timeout });
  }

  /**
   * Assert all stats cards are visible.
   */
  async expectStatsVisible() {
    await expect(this.monthlySpendingStat).toBeVisible();
    await expect(this.totalExpensesStat).toBeVisible();
    await expect(this.avgPerExpenseStat).toBeVisible();
  }

  /**
   * Assert recent expenses section is visible.
   */
  async expectRecentExpensesVisible() {
    await expect(this.recentExpensesHeading).toBeVisible();
  }

  /**
   * Assert navigation sidebar is visible.
   */
  async expectNavigationVisible() {
    await expect(this.dashboardLink).toBeVisible();
    await expect(this.expensesLink).toBeVisible();
    await expect(this.importLink).toBeVisible();
  }

  /**
   * Assert dollar amounts are properly formatted.
   */
  async expectDollarFormatting() {
    const dollarAmount = this.page.locator('text=/\\$[0-9]+/');
    await expect(dollarAmount.first()).toBeVisible();
  }
}
