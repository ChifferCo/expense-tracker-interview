import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';

// Helper to format date as displayed in expense rows (e.g., "Feb 19, 2025")
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

test.describe('Expenses', () => {
  // Run tests sequentially to ensure isolation and prevent interference
  // This prevents tests from affecting each other when they create/delete expenses
  test.describe.configure({ mode: 'serial' });
  // Allow more time for create + dashboard verification + cleanup
  test.setTimeout(30000);

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');
    await dashboardPage.expectDashboardVisible(10000);
    const expensesPage = new ExpensesPage(page);
    await expensesPage.goto();
    // Wait for network requests to complete after navigation
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expect(expensesPage.heading).toBeVisible({ timeout: 10000 });
  });

  // Cleanup: Delete test expenses to ensure isolation between test runs
  test.afterEach(async ({ page }) => {
    try {
      // Navigate to expenses page to clean up
      const expensesPage = new ExpensesPage(page);
      await expensesPage.goto();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Get all expense rows
      const expenseRows = await page.getByTestId('expense-row').all();
      
      for (const row of expenseRows) {
        try {
          const description = await row.getAttribute('data-expense-description');
          // Delete expenses created by our tests (identified by specific prefixes)
          if (description && (
            description.includes('E2E expense') ||
            description.includes('To edit') ||
            description.includes('To delete') ||
            description.includes('SearchTarget-') ||
            description.includes('OutsidePeriod-')
          )) {
            const deleteButton = row.getByTestId('expense-delete');
            if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await deleteButton.click();
              await page.waitForSelector('[data-testid="modal-delete-expense-confirm"]', { timeout: 2000 });
              await page.getByTestId('modal-delete-expense-confirm').click();
              // Wait for deletion modal to close
              await page.waitForSelector('[data-testid="modal-delete-expense-confirm"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
              await page.waitForTimeout(300);
            }
          }
        } catch (e) {
          // Continue with next row if this one fails
        }
      }
    } catch (e) {
      // Ignore cleanup errors to not fail tests
    }
  });

  test.skip('shows expenses page with add button and filters', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expect(expenses.addExpenseButton).toBeVisible();
    await expect(expenses.searchInput).toBeVisible();
    await expect(expenses.dateRangeLabel).toBeVisible();
    await expect(expenses.filterAllTime).toBeVisible();
  });

  test.skip('can open add expense modal and see form', async ({ page }) => {
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

  test.skip('validation prevents empty or invalid expense', async ({ page }) => {
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
    const today = new Date();
    const expectedDate = formatDisplayDate(today);
    
    await expenses.createExpense({ amount: '25.50', description });
    await expect(expenses.modalAddExpenseHeading).not.toBeVisible({ timeout: 5000 });
    await expenses.expectExpenseVisible(description, 5000);
    await expect(expenses.expenseRowByDescription(description).getByText('$25.50')).toBeVisible();
    
    // Verify date is displayed correctly on expenses page
    const expensesPageRow = expenses.expenseRowByDescription(description);
    await expect(expensesPageRow.getByText(expectedDate, { exact: false })).toBeVisible();

    // Verify expense persists: go to dashboard then back to expenses and confirm expense is still there
    // (Dashboard only shows first 5 expenses, so we don't assert the row on dashboard.)
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.expectDashboardVisible(5000);
    await page.waitForSelector('[data-testid="expense-list"], [data-testid="expense-list-empty"]', { timeout: 10000 });

    await expenses.goto();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expenses.expectExpenseVisible(description, 5000);
    await expect(expenses.expenseRowByDescription(description).getByText('$25.50')).toBeVisible();
    await expect(expenses.expenseRowByDescription(description).getByText(expectedDate, { exact: false })).toBeVisible();
  });

  test('can edit an expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    const description = `To edit ${Date.now()}`;
    const today = new Date();
    const expectedDate = formatDisplayDate(today);
    
    await expenses.createExpense({ amount: '10', description });
    await expenses.expectExpenseVisible(description, 5000);
    
    // Verify date before edit
    await expect(expenses.expenseRowByDescription(description).getByText(expectedDate, { exact: false })).toBeVisible();

    await expenses.expenseRowByDescription(description).getByTestId('expense-edit').click();
    await expect(expenses.modalEditExpenseHeading).toBeVisible();
    await expenses.formDescription.fill(`${description} updated`);
    await expenses.submitUpdateExpense();
    await expect(expenses.modalEditExpenseHeading).not.toBeVisible({ timeout: 5000 });
    await expect(expenses.expenseRowByDescription(`${description} updated`)).toBeVisible();
    
    // Verify date after edit (should remain the same)
    await expect(expenses.expenseRowByDescription(`${description} updated`).getByText(expectedDate, { exact: false })).toBeVisible();

    // Verify updated expense persists: go to dashboard then back to expenses and confirm it's still there
    // (Dashboard only shows first 5 expenses, so we don't assert the row on dashboard.)
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.expectDashboardVisible(5000);
    await page.waitForSelector('[data-testid="expense-list"], [data-testid="expense-list-empty"]', { timeout: 10000 });

    await expenses.goto();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expenses.expectExpenseVisible(`${description} updated`, 5000);
    await expect(expenses.expenseRowByDescription(`${description} updated`).getByText('$10.00')).toBeVisible();
    await expect(expenses.expenseRowByDescription(`${description} updated`).getByText(expectedDate, { exact: false })).toBeVisible();
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

    // Search for the expense - wait for deferred value and API call to complete
    await expenses.searchInput.fill('SearchTarget');
    // Wait for network request to complete after deferred value updates
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expect(expenses.expenseRowByDescription(uniqueDesc)).toBeVisible({ timeout: 5000 });
    
    // Search for non-existent query - wait for deferred value and API call to complete
    await expenses.searchInput.fill('NonExistentQuery12345');
    // Wait for network request to complete after deferred value updates
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expect(expenses.expenseRowByDescription(uniqueDesc)).not.toBeVisible({ timeout: 5000 });
  });

  test.skip('date filter presets are clickable', async ({ page }) => {
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
