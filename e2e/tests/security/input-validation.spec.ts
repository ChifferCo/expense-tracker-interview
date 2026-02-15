/**
 * @fileoverview E2E tests for input validation security
 *
 * Tests verify the application handles malicious or edge-case inputs safely.
 *
 * @see frontend/src/components/ExpenseForm.tsx
 * @see backend/src/routes/expenses.ts
 */

import { test, expect } from '../../support';
import { ExpensesPage, ExpenseFormPage } from '../../support';

test.describe('SEC-003: Input Validation', () => {
  test('should handle very long description input', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const longDescription = 'A'.repeat(10000);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.fill({
      amount: '5',
      description: longDescription,
    });
    await expenseForm.submitCreate();

    // Assert - should handle gracefully without crashing
    await authenticatedPage.waitForTimeout(2000);
    await expect(expensesPage.heading).toBeVisible();
  });

  test('should handle negative amount', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.fill({
      amount: '-50',
      description: 'Negative test',
    });
    await expenseForm.submitCreate();

    // Assert - should show validation error
    await expect(authenticatedPage.getByText(/greater than 0|positive|invalid/i)).toBeVisible({ timeout: 2000 });
  });

  test('should handle zero amount', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.fill({
      amount: '0',
      description: 'Zero test',
    });
    await expenseForm.submitCreate();

    // Assert - should show validation error
    await expect(authenticatedPage.getByText(/greater than 0/i)).toBeVisible({ timeout: 2000 });
  });
});
