import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';

test.describe('Expenses', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');
    await dashboardPage.expectDashboardVisible(10000);
    const expensesPage = new ExpensesPage(page);
    await expensesPage.goto();
    await expect(expensesPage.heading).toBeVisible();
  });

  test('shows expenses page with add button and filters', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expect(expenses.addExpenseButton).toBeVisible();
    await expect(expenses.searchInput).toBeVisible();
    await expect(expenses.dateRangeLabel).toBeVisible();
    await expect(expenses.filterAllTime).toBeVisible();
  });

  test('can open add expense modal and see form', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openAddExpenseModal();
    await expect(expenses.modalAddExpenseHeading).toBeVisible({ timeout: 5000 });
    await expect(expenses.formCategory).toBeVisible();
    await expect(expenses.formAmount).toBeVisible();
    await expect(expenses.formDescription).toBeVisible();
    await expect(expenses.formDate).toBeVisible();
    await expenses.cancelModal();
    await expect(expenses.modalAddExpenseHeading).not.toBeVisible();
  });

  test('validation prevents empty or invalid expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openAddExpenseModal();
    await expect(expenses.modalAddExpenseHeading).toBeVisible();
    await expect(expenses.formCreateButton).toBeVisible();
    await expenses.formCreateButton.click();
    await expect(expenses.validationError).toBeVisible();
    await expenses.formAmount.fill('0');
    await expenses.formDescription.fill('Test');
    await expenses.formCreateButton.click();
    await expect(expenses.validationAmountError).toBeVisible();
  });

  test('can create a new expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const description = `E2E expense ${Date.now()}`;
    await expenses.createExpense({ amount: '25.50', description });
    await expect(expenses.modalAddExpenseHeading).not.toBeVisible({ timeout: 5000 });
    await expenses.expectExpenseVisible(description, 5000);
    await expect(expenses.expenseRowByDescription(description).getByText('$25.50')).toBeVisible();
  });

  test('can edit an expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const description = `To edit ${Date.now()}`;
    await expenses.createExpense({ amount: '10', description });
    await expenses.expectExpenseVisible(description, 5000);

    await expenses.expenseRowByDescription(description).getByTestId('expense-edit').click();
    await expect(expenses.modalEditExpenseHeading).toBeVisible();
    await expenses.formDescription.fill(`${description} updated`);
    await expenses.submitUpdateExpense();
    await expect(expenses.modalEditExpenseHeading).not.toBeVisible({ timeout: 5000 });
    await expect(expenses.expenseRowByDescription(`${description} updated`)).toBeVisible();
  });

  test('can delete an expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const description = `To delete ${Date.now()}`;
    await expenses.createExpense({ amount: '5', description });
    await expenses.expectExpenseVisible(description, 5000);

    await expenses.expenseRowByDescription(description).getByTestId('expense-delete').click();
    await expect(expenses.modalDeleteHeading).toBeVisible();
    await expect(expenses.deleteConfirmMessage).toBeVisible();
    await expenses.confirmDelete();
    await expect(expenses.modalDeleteHeading).not.toBeVisible({ timeout: 5000 });
    await expect(expenses.expenseRowByDescription(description)).not.toBeVisible();
  });

  test('search filters expenses', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const uniqueDesc = `SearchTarget-${Date.now()}`;
    await expenses.createExpense({ amount: '1', description: uniqueDesc });
    await expenses.expectExpenseVisible(uniqueDesc, 5000);

    await expenses.searchInput.fill('SearchTarget');
    await expect(expenses.expenseRowByDescription(uniqueDesc)).toBeVisible();
    await expenses.searchInput.fill('NonExistentQuery12345');
    await expect(expenses.expenseRowByDescription(uniqueDesc)).not.toBeVisible();
  });

  test('date filter presets are clickable', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.filterThisMonth.click();
    await expenses.filterLastMonth.click();
    await expenses.filterLast12Months.click();
    await expenses.filterCustom.click();
    await expect(expenses.customStartDateLabel).toBeVisible();
    await expect(expenses.customEndDateLabel).toBeVisible();
  });

  test('date filter hides expense added outside the selected period', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const description = `OutsidePeriod-${Date.now()}`;

    // Select "This Month" filter so only current month expenses are shown
    await expenses.filterThisMonth.click();

    // Create expense dated one day prior to the selected period (last day of previous month)
    const now = new Date();
    const oneDayBeforePeriod = new Date(now.getFullYear(), now.getMonth(), 0);
    const dateOutsidePeriod = oneDayBeforePeriod.toISOString().split('T')[0];

    await expenses.createExpense({
      amount: '99.99',
      description,
      date: dateOutsidePeriod,
    });
    await expect(expenses.modalAddExpenseHeading).not.toBeVisible({ timeout: 5000 });

    // Expense should NOT be visible because it falls outside "This Month"
    await expect(expenses.expenseRowByDescription(description)).not.toBeVisible();

    // Switch to "All Time" to confirm the expense exists
    await expenses.filterAllTime.click();
    await expenses.expectExpenseVisible(description, 5000);
  });
});
