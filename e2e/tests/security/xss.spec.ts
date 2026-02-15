/**
 * @fileoverview E2E tests for XSS protection
 *
 * Tests verify the application properly escapes HTML and prevents XSS attacks.
 *
 * @see frontend/src/components/ExpenseList.tsx
 */

import { test, expect } from '../../support';
import { ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('SEC-001: XSS Protection', () => {
  test('should escape HTML in expense description', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const xssPayload = '<script>alert("XSS")</script>';
    const futureDate = TestDataFactory.futureDate();

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.createExpense({
      amount: '10',
      description: xssPayload,
      date: futureDate, // Use future date to ensure visibility in list
    });

    // Wait for expense to be created
    await expenseForm.expectAddModalNotVisible();

    // Assert - the script should be escaped/displayed as text, not executed
    const pageContent = await authenticatedPage.content();
    expect(pageContent).not.toContain('<script>alert("XSS")</script>');
  });

  test('should escape HTML entities in expense description display', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const xssPayload = '<img src=x onerror=alert("XSS")>';
    const futureDate = TestDataFactory.futureDate();

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.createExpense({
      amount: '15',
      description: xssPayload,
      date: futureDate, // Use future date to ensure visibility in list
    });

    await expenseForm.expectAddModalNotVisible();

    // Assert - the img tag should not be rendered as HTML
    const images = await authenticatedPage.locator('img[src="x"]').count();
    expect(images).toBe(0);
  });

  test('should handle special characters safely', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const testId = TestDataFactory.uniqueId();
    const specialChars = `& < > " ' / \\ [${testId}]`;
    const futureDate = TestDataFactory.futureDate();

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.createExpense({
      amount: '20',
      description: specialChars,
      date: futureDate, // Use future date to ensure visibility in list
    });

    await expenseForm.expectAddModalNotVisible();

    // Assert - special characters should be displayed correctly
    // Use testId to find the expense since special chars can be tricky for exact matching
    const expenseItem = expensesPage.getExpenseItem(testId);
    await expect(expenseItem).toBeVisible({ timeout: 10000 });
    // Verify the item contains the special characters by checking the text content
    const textContent = await expenseItem.textContent();
    expect(textContent).toContain('&');
    expect(textContent).toContain('<');
    expect(textContent).toContain('>');
  });
});
