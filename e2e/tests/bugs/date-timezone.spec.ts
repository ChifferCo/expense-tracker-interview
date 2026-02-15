/**
 * @fileoverview Bug Documentation Tests - Date Timezone
 *
 * These tests document known bugs in date handling. Tests are EXPECTED TO FAIL
 * because they assert the correct behavior that is currently broken.
 *
 * ## BUG-004: Date Timezone Bug
 * **Issue:** Dates may display incorrectly due to timezone handling
 * **Expected:** Date "2024-06-15" should display as "Jun 15, 2024"
 * **Actual:** May display as "Jun 14, 2024" depending on timezone
 *
 * @see frontend/src/components/ExpenseList.tsx
 */

import { test, expect } from '../../support';
import { ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('BUG-004: Date Timezone Bug', () => {
  /**
   * BUG: Dates may display incorrectly due to timezone handling.
   * When a date is saved as "2024-01-15", it might display as "Jan 14, 2024"
   * depending on the user's timezone.
   *
   * Expected: Date should display exactly as entered
   * Actual: Date may be off by one day due to UTC conversion
   */
  test('should display date exactly as entered', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    // Use a future date to ensure visibility, and a date that's likely to show timezone issues
    const testDate = '2035-06-15'; // June 15, 2035 (future date to appear in list)
    const uniqueDesc = `Timezone test ${TestDataFactory.uniqueId()}`;

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.createExpense({
      amount: '25',
      description: uniqueDesc,
      date: testDate,
    });

    // Wait for expense to appear
    await expensesPage.expectExpenseVisible(uniqueDesc);

    // Assert - check the displayed date
    const expenseItem = expensesPage.getExpenseItem(uniqueDesc);
    const displayedDate = await expenseItem.textContent();

    // BUG: Date might show as "Jun 14, 2035" instead of "Jun 15, 2035"
    expect(displayedDate).toContain('Jun 15');
  });
});
