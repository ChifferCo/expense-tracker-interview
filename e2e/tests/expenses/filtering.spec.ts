/**
 * @fileoverview E2E tests for expense filtering and search
 *
 * Tests cover search functionality and date filtering.
 *
 * @see frontend/src/pages/Expenses.tsx
 */

import { test } from '../../support';
import { ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('Search', () => {
  test('should filter expenses by search query', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const searchTerm = TestDataFactory.searchTerm('unique');
    const expense = TestDataFactory.expense({ description: `${searchTerm} expense` });

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: '30.00',
      description: expense.description,
      date: expense.date, // Use future date to ensure visibility in list
    });
    await expensesPage.expectExpenseVisible(expense.description);

    // Act
    await expensesPage.search(searchTerm);

    // Assert
    await expensesPage.expectExpenseVisible(expense.description);
  });
});

test.describe('Date Filtering', () => {
  test('should filter by this month', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    await expensesPage.goto();

    // Act
    await expensesPage.selectDateFilter('thisMonth');

    // Assert
    await expensesPage.expectFilterActive('thisMonth');
  });

  test('should show custom date inputs when Custom is selected', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    await expensesPage.goto();

    // Act
    await expensesPage.selectDateFilter('custom');

    // Assert
    await expensesPage.expectCustomDateInputsVisible();
  });

  test('should have all date filter options visible', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);

    // Act
    await expensesPage.goto();

    // Assert
    await expensesPage.expectDateFiltersVisible();
  });
});
