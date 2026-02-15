/**
 * @fileoverview Bug Documentation Tests - Dashboard Delete
 *
 * These tests document known bugs in the dashboard. Tests are EXPECTED TO FAIL
 * because they assert the correct behavior that is currently broken.
 *
 * ## BUG-003: Dashboard Delete Button
 * **Issue:** Delete button on dashboard's recent expenses does nothing
 * **Expected:** Should open delete confirmation modal
 * **Actual:** onClick handler is empty function `() => {}`
 *
 * @see frontend/src/pages/Dashboard.tsx
 */

import { test, expect } from '../../support';
import { DashboardPage, ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('BUG-003: Dashboard Delete Button', () => {
  /**
   * BUG: The delete button on the dashboard's recent expenses list
   * does nothing when clicked. The onDelete handler is set to an empty function.
   *
   * Expected: Delete button should delete the expense or show confirmation
   * Actual: Delete button does nothing (onClick={() => {}})
   */
  test('should delete expense from dashboard', async ({ authenticatedPage }) => {
    // Arrange - create an expense first
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const dashboardPage = new DashboardPage(authenticatedPage);
    const expense = TestDataFactory.expense({ description: `Dashboard delete ${TestDataFactory.uniqueId()}` });

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: '10',
      description: expense.description,
      date: expense.date, // Use future date to ensure visibility in list
    });
    await expensesPage.expectExpenseVisible(expense.description);

    // Go back to dashboard
    await dashboardPage.dashboardLink.click();
    await dashboardPage.expectLoaded();

    // Wait for recent expenses to load
    await expect(authenticatedPage.getByText(expense.description)).toBeVisible({ timeout: 5000 });

    // Act - try to delete from dashboard
    await dashboardPage.clickDeleteOnExpense(expense.description);

    // Assert - BUG: Nothing happens - the delete confirmation modal should appear
    await expect(authenticatedPage.getByRole('heading', { name: 'Delete Expense' })).toBeVisible({ timeout: 2000 });
  });
});
