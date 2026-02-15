/**
 * @fileoverview Bug Documentation Tests - Amount Validation
 *
 * These tests document known bugs in amount validation. Tests are EXPECTED TO FAIL
 * because they assert the correct behavior that is currently broken.
 *
 * ## BUG-001: Amount Field Validation
 * **Issue:** Amount input accepts "e" character (HTML number inputs allow scientific notation)
 * **Expected:** Only digits and decimal point should be accepted
 * **Actual:** "1e2" is accepted and interpreted as 100
 *
 * @see frontend/src/components/ExpenseForm.tsx
 */

import { test, expect } from '../../support';
import { ExpensesPage, ExpenseFormPage } from '../../support';

test.describe('BUG-001: Amount Field Validation', () => {
  /**
   * BUG: The amount input field accepts the "e" character because HTML number
   * inputs allow scientific notation (e.g., 1e5 = 100000). This can lead to
   * confusion or invalid data entry.
   *
   * Expected: Amount field should only accept numeric digits and decimal point
   * Actual: Amount field accepts "e" character for scientific notation
   */
  test('should reject "e" character in amount field', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - try to enter "e" in amount field
    await expenseForm.fill({ amount: '1e2' });
    const value = await expenseForm.getAmountValue();

    // Assert - "e" should not be accepted (BUG: it currently is)
    expect(value).not.toContain('e');
  });

  test('should not allow scientific notation in amount', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - try to submit with scientific notation
    await expenseForm.fill({
      amount: '1e2',
      description: 'Test scientific notation',
    });
    await expenseForm.submitCreate();

    // Assert - should show validation error
    // BUG: This creates an expense with amount 100 (1e2 = 100) instead of rejecting
    await expenseForm.expectInvalidAmountError();
  });
});
