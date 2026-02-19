import type { Page } from '@playwright/test';
import { AppLayout } from './AppLayout.js';

export class DashboardPage {
  readonly layout: AppLayout;

  constructor(private readonly page: Page) {
    this.layout = new AppLayout(page);
  }

  get heading() {
    return this.page.getByTestId('dashboard-heading');
  }

  get statsSection() {
    return this.page.getByTestId('dashboard-stats');
  }

  get recentExpensesHeading() {
    return this.page.getByTestId('dashboard-recent-expenses-heading');
  }

  get firstEditExpenseButton() {
    return this.page.getByTestId('expense-edit').first();
  }

  get firstDeleteExpenseButton() {
    return this.page.getByTestId('expense-delete').first();
  }

  get emptyOrRecentSection() {
    return this.page.getByTestId('dashboard-recent-expenses-heading').or(this.page.getByTestId('expense-list-empty'));
  }

  expenseRowByDescription(description: string) {
    return this.page.getByTestId('expense-row').filter({ hasText: description });
  }

  // Stats getters - these selectors target the stat values within the dashboard-stats section
  // Each stat card has a <dl> with a <dd> containing the value (first <dd> is always the value)
  get monthlySpendingValue() {
    return this.statsSection.locator('dl').first().locator('dd').first();
  }

  get totalExpensesValue() {
    return this.statsSection.locator('dl').nth(1).locator('dd').first();
  }

  get avgPerExpenseValue() {
    return this.statsSection.locator('dl').nth(2).locator('dd').first();
  }

  async getMonthlySpending(): Promise<string> {
    return await this.monthlySpendingValue.textContent() || '';
  }

  async getTotalExpenses(): Promise<string> {
    return await this.totalExpensesValue.textContent() || '';
  }

  async getAvgPerExpense(): Promise<string> {
    return await this.avgPerExpenseValue.textContent() || '';
  }

  async getFirstExpenseDescription(): Promise<string | null> {
    const firstExpenseRow = this.page.getByTestId('expense-row').first();
    if (await firstExpenseRow.isVisible()) {
      return await firstExpenseRow.getAttribute('data-expense-description');
    }
    return null;
  }

  async getFirstExpenseId(): Promise<string | null> {
    const firstExpenseRow = this.page.getByTestId('expense-row').first();
    if (await firstExpenseRow.isVisible()) {
      return await firstExpenseRow.getAttribute('data-expense-id');
    }
    return null;
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectDashboardVisible(timeout = 10000) {
    await this.heading.waitFor({ state: 'visible', timeout });
  }
}
