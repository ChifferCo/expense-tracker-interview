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

  get emptyOrRecentSection() {
    return this.page.getByTestId('dashboard-recent-expenses-heading').or(this.page.getByTestId('expense-list-empty'));
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectDashboardVisible(timeout = 10000) {
    await this.heading.waitFor({ state: 'visible', timeout });
  }
}
