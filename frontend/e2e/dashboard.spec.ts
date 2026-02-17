import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';
import { ImportPage } from './pages/ImportPage.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');
    await dashboardPage.expectDashboardVisible(10000);
  });

  test('shows dashboard with stats and recent expenses section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.statsSection).toBeVisible();
    await expect(dashboard.recentExpensesHeading).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expensesPage = new ExpensesPage(page);
    const importPage = new ImportPage(page);
    await expect(dashboard.layout.linkDashboard).toBeVisible();
    await dashboard.layout.goToExpenses();
    await expect(expensesPage.heading).toBeVisible();
    await expect(expensesPage.addExpenseButton).toBeVisible();

    await dashboard.layout.goToImport();
    await expect(importPage.heading).toBeVisible();
    await expect(importPage.startImportButton).toBeVisible();

    await dashboard.layout.goToDashboard();
    await expect(dashboard.heading).toBeVisible();
  });

  test('clicking edit on recent expense navigates to expenses with edit', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expensesPage = new ExpensesPage(page);
    const editButton = dashboard.firstEditExpenseButton;
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page).toHaveURL(/\/expenses\?edit=/);
      await expect(expensesPage.modalEditExpenseHeading).toBeVisible({ timeout: 5000 });
    } else {
      await expect(dashboard.emptyOrRecentSection).toBeVisible();
    }
  });
});
