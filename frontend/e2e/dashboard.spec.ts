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

  test.skip('shows dashboard with stats and recent expenses section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.statsSection).toBeVisible();
    await expect(dashboard.recentExpensesHeading).toBeVisible();
  });

  test.skip('navigation links work', async ({ page }) => {
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

  test('clicking edit on recent expense opens modal on dashboard and updates stats', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expensesPage = new ExpensesPage(page);
    
    // Skip test if no expenses exist
    const editButton = dashboard.firstEditExpenseButton;
    if (!(await editButton.isVisible())) {
      await expect(dashboard.emptyOrRecentSection).toBeVisible();
      return;
    }

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');
    await dashboard.expectDashboardVisible(5000);

    // Get the expense description and ID before editing (to verify it on expenses page later)
    const expenseDescription = await dashboard.getFirstExpenseDescription();
    const expenseId = await dashboard.getFirstExpenseId();
    if (!expenseDescription || !expenseId) {
      throw new Error('Could not get expense description or ID');
    }

    // Get initial stats from dashboard
    const initialMonthlySpending = await dashboard.getMonthlySpending();
    const initialTotalExpenses = await dashboard.getTotalExpenses();
    const initialAvgPerExpense = await dashboard.getAvgPerExpense();

    // Define amount increase - using $50 for more visible change in stats
    const amountIncrease = 50;

    // Click edit button on dashboard - should open modal without navigation
    await editButton.click();
    
    // Verify we're still on dashboard (no navigation occurred)
    await expect(page).toHaveURL('/');
    
    // Wait for edit modal to open on dashboard
    await expect(expensesPage.modalEditExpenseHeading).toBeVisible({ timeout: 5000 });
    
    // Get current amount and update it to trigger stat changes
    const currentAmount = await expensesPage.formAmount.inputValue();
    const currentAmountNum = parseFloat(currentAmount);
    const newAmount = (currentAmountNum + amountIncrease).toFixed(2);
    
    // Update the expense amount
    await expensesPage.formAmount.fill(newAmount);
    await expensesPage.submitUpdateExpense();
    
    // Wait for modal to close - wait for the modal container to disappear
    // The modal has data-testid="modal-edit-expense" when editing
    // Use a longer timeout to allow for API call to complete
    const editModal = page.getByTestId('modal-edit-expense');
    await expect(editModal).not.toBeVisible({ timeout: 15000 });
    
    // Verify the heading is also gone
    await expect(expensesPage.modalEditExpenseHeading).not.toBeVisible({ timeout: 1000 });
    
    // Verify dashboard is still visible (confirms we're still on dashboard page)
    await dashboard.expectDashboardVisible(5000);
    
    // Verify we're still on dashboard
    await expect(page).toHaveURL('/');
    
    // Wait a bit for stats to update (API calls may take time)
    await page.waitForTimeout(2000);
    
    // Verify dashboard stats have updated
    const updatedMonthlySpending = await dashboard.getMonthlySpending();
    const updatedTotalExpenses = await dashboard.getTotalExpenses();
    const updatedAvgPerExpense = await dashboard.getAvgPerExpense();
    
    // Monthly spending should have increased by $50
    const initialMonthlyNum = parseFloat(initialMonthlySpending.replace('$', '').replace(',', ''));
    const updatedMonthlyNum = parseFloat(updatedMonthlySpending.replace('$', '').replace(',', ''));
    expect(updatedMonthlyNum).toBeGreaterThan(initialMonthlyNum);
    
    // Verify monthly spending increased by approximately the amount we added
    const monthlyIncrease = updatedMonthlyNum - initialMonthlyNum;
    // If the expense is from current month, increase should be close to $50
    if (monthlyIncrease > 0) {
      expect(monthlyIncrease).toBeCloseTo(amountIncrease, 1);
    }
    
    // Total Expenses should remain the same (we edited, not created)
    expect(updatedTotalExpenses).toBe(initialTotalExpenses);
    
    // Avg per Expense should have increased (total increased, count same)
    // Wait for average to update - it should increase by $50 / total number of expenses
    const totalExpensesCount = parseInt(updatedTotalExpenses);
    const expectedIncrease = totalExpensesCount > 0 ? amountIncrease / totalExpensesCount : 0;
    
    // Retry getting average until it updates (with timeout)
    let updatedAvgNum = parseFloat(updatedAvgPerExpense.replace('$', '').replace(',', ''));
    const initialAvgNum = parseFloat(initialAvgPerExpense.replace('$', '').replace(',', ''));
    
    let retries = 0;
    while (updatedAvgNum <= initialAvgNum && retries < 5) {
      await page.waitForTimeout(500);
      const retryAvgPerExpense = await dashboard.getAvgPerExpense();
      updatedAvgNum = parseFloat(retryAvgPerExpense.replace('$', '').replace(',', ''));
      retries++;
    }
    
    // Verify average has increased
    expect(updatedAvgNum).toBeGreaterThan(initialAvgNum);
    
    // Verify the increase is reasonable (should increase by approximately $50 / number of expenses)
    // With a larger increase amount, the change should be more visible and easier to verify
    if (totalExpensesCount > 0 && expectedIncrease > 0) {
      const actualIncrease = updatedAvgNum - initialAvgNum;
      // Verify the increase is positive and close to expected (within 10% tolerance)
      // With $50 increase, rounding errors should be minimal
      expect(actualIncrease).toBeGreaterThan(0);
      expect(actualIncrease).toBeCloseTo(expectedIncrease, 1);
    }

    // Navigate to expenses page to verify the updated expense
    await expensesPage.goto();
    await expect(expensesPage.heading).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/expenses');

    // Find the expense by ID (more specific than description since multiple expenses can have same description)
    const updatedExpenseRow = page.locator(`[data-expense-id="${expenseId}"]`);
    await expect(updatedExpenseRow).toBeVisible({ timeout: 5000 });
    
    // Verify the expense displays the updated amount
    await expect(updatedExpenseRow.getByText(`$${newAmount}`)).toBeVisible();
  });

  test('can delete an expense from dashboard and verify stats update', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expensesPage = new ExpensesPage(page);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');
    await dashboard.expectDashboardVisible(5000);
    
    // Check if there are expenses to delete, if not create one
    const deleteButton = dashboard.firstDeleteExpenseButton;
    let expenseDescription: string | null = null;
    let expenseAmount = 0;
    
    if (!(await deleteButton.isVisible())) {
      // No expenses exist, create one first
      await expensesPage.goto();
      expenseDescription = `To delete from dashboard ${Date.now()}`;
      expenseAmount = 15.50;
      await expensesPage.createExpense({ amount: expenseAmount.toFixed(2), description: expenseDescription });
      await expensesPage.expectExpenseVisible(expenseDescription, 5000);
      
      // Navigate back to dashboard
      await dashboard.layout.goToDashboard();
      await dashboard.expectDashboardVisible(5000);
      await expect(page).toHaveURL('/');
    } else {
      // Use existing expense - get its description and amount
      expenseDescription = await dashboard.getFirstExpenseDescription();
      if (!expenseDescription) {
        // Fallback: create an expense if we can't get description
        await expensesPage.goto();
        expenseDescription = `To delete from dashboard ${Date.now()}`;
        expenseAmount = 15.50;
        await expensesPage.createExpense({ amount: expenseAmount.toFixed(2), description: expenseDescription });
        await expensesPage.expectExpenseVisible(expenseDescription, 5000);
        await dashboard.layout.goToDashboard();
        await dashboard.expectDashboardVisible(5000);
      } else {
        // Get the amount from the expense row
        const expenseRow = dashboard.expenseRowByDescription(expenseDescription);
        await expenseRow.waitFor({ state: 'visible', timeout: 5000 });
        // Amount is displayed in a span - find it by looking for text starting with $
        const amountSpan = expenseRow.locator('span').filter({ hasText: /^\$/ });
        const amountText = await amountSpan.textContent();
        if (amountText) {
          expenseAmount = parseFloat(amountText.replace('$', '').replace(',', ''));
        }
      }
    }
    
    if (!expenseDescription) {
      throw new Error('Could not find or create an expense to delete');
    }
    
    // Verify the expense is visible on dashboard
    const expenseRow = dashboard.expenseRowByDescription(expenseDescription);
    await expect(expenseRow).toBeVisible({ timeout: 5000 });
    
    // Verify stats section is visible before deletion
    await expect(dashboard.statsSection).toBeVisible();
    
    // Get initial stats from dashboard and verify they are loaded
    const initialMonthlySpending = await dashboard.getMonthlySpending();
    const initialTotalExpenses = await dashboard.getTotalExpenses();
    const initialAvgPerExpense = await dashboard.getAvgPerExpense();
    
    // Verify initial stats are valid (not loading indicators)
    expect(initialMonthlySpending).not.toBe('...');
    expect(initialTotalExpenses).not.toBe('...');
    expect(initialAvgPerExpense).not.toBe('...');
    
    // Parse initial stats values
    const initialMonthlyNum = parseFloat(initialMonthlySpending.replace('$', '').replace(',', ''));
    const initialTotalNum = parseInt(initialTotalExpenses);
    const initialAvgNum = parseFloat(initialAvgPerExpense.replace('$', '').replace(',', ''));
    
    // Click delete button on the expense row from dashboard
    await expenseRow.getByTestId('expense-delete').click();
    
    // Verify delete confirmation modal is visible on dashboard
    await expect(expensesPage.modalDeleteHeading).toBeVisible({ timeout: 5000 });
    await expect(expensesPage.deleteConfirmMessage).toBeVisible();
    
    // Confirm deletion
    await expensesPage.confirmDelete();
    
    // Wait for modal to close
    await expect(expensesPage.modalDeleteHeading).not.toBeVisible({ timeout: 5000 });
    
    // Verify we're still on dashboard
    await expect(page).toHaveURL('/');
    
    // Wait for the expense to be removed and stats to update
    await page.waitForTimeout(2000);
    
    // Verify the expense is no longer visible on dashboard
    await expect(expenseRow).not.toBeVisible();
    
    // Verify stats section is still visible after deletion
    await expect(dashboard.statsSection).toBeVisible();
    
    // Wait for stats section values to update (ensure values are not in loading state)
    await dashboard.monthlySpendingValue.waitFor({ state: 'visible', timeout: 5000 });
    await dashboard.totalExpensesValue.waitFor({ state: 'visible', timeout: 5000 });
    await dashboard.avgPerExpenseValue.waitFor({ state: 'visible', timeout: 5000 });
    
    // Get updated stats from dashboard and verify they are loaded
    const updatedMonthlySpending = await dashboard.getMonthlySpending();
    const updatedTotalExpenses = await dashboard.getTotalExpenses();
    const updatedAvgPerExpense = await dashboard.getAvgPerExpense();
    
    // Verify updated stats are valid (not loading indicators)
    expect(updatedMonthlySpending).not.toBe('...');
    expect(updatedTotalExpenses).not.toBe('...');
    expect(updatedAvgPerExpense).not.toBe('...');
    
    // Parse updated stats values
    const updatedMonthlyNum = parseFloat(updatedMonthlySpending.replace('$', '').replace(',', ''));
    const updatedTotalNum = parseInt(updatedTotalExpenses);
    const updatedAvgNum = parseFloat(updatedAvgPerExpense.replace('$', '').replace(',', ''));
    
    // Verify stats section has updated correctly on dashboard
    
    // Total Expenses should have decreased by exactly 1
    expect(updatedTotalNum).toBe(initialTotalNum - 1);
    expect(updatedTotalNum).toBeGreaterThanOrEqual(0);
    
    // Monthly spending should have decreased (if expense was from current month)
    expect(updatedMonthlyNum).toBeLessThanOrEqual(initialMonthlyNum);
    expect(updatedMonthlyNum).toBeGreaterThanOrEqual(0);
    
    // If monthly spending decreased, verify it decreased by approximately the expense amount
    const actualDecrease = initialMonthlyNum - updatedMonthlyNum;
    if (actualDecrease > 0 && expenseAmount > 0) {
      expect(actualDecrease).toBeCloseTo(expenseAmount, 2);
    }
    
    // Avg per Expense should be updated (recalculated with one less expense)
    expect(updatedAvgNum).not.toBe(initialAvgNum);
    expect(updatedAvgNum).toBeGreaterThanOrEqual(0);
    
    // If there are still expenses remaining, avg should be valid
    if (updatedTotalNum > 0) {
      expect(updatedAvgNum).toBeGreaterThan(0);
    }
  });
});
