/**
 * @fileoverview E2E tests for expense CRUD operations
 *
 * Tests cover create, read, update, and delete operations for expenses.
 *
 * @see frontend/src/pages/Expenses.tsx
 * @see frontend/src/components/ExpenseForm.tsx
 */

import { test } from '../../support';
import { ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('Expenses Page', () => {
  test('should display expenses list', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);

    // Act
    await expensesPage.goto();

    // Assert
    await expensesPage.expectLoaded();
    await expensesPage.expectDateFiltersVisible();
  });
});

test.describe('Create Expense', () => {
  test('should open create expense modal', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    await expensesPage.goto();

    // Act
    await expensesPage.openAddExpenseModal();

    // Assert
    await expenseForm.expectAddModalVisible();
  });

  test('should create new expense successfully', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const expense = TestDataFactory.expense();
    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date, // Use future date to ensure visibility in list
    });

    // Assert
    await expenseForm.expectAddModalNotVisible();
    await expensesPage.expectExpenseVisible(expense.description);
  });

  test('should show validation error for empty amount', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.clearAmount();
    await expenseForm.fill({ description: 'Test' });
    await expenseForm.submitCreate();

    // Assert
    await expenseForm.expectAmountValidationError();
  });

  test('should close modal on cancel', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act
    await expenseForm.cancel();

    // Assert
    await expenseForm.expectAddModalNotVisible();
  });
});

test.describe('Edit Expense', () => {
  test('should edit existing expense', async ({ authenticatedPage }) => {
    // Arrange - create an expense first
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const originalExpense = TestDataFactory.expense({ description: `Original ${TestDataFactory.uniqueId()}` });
    const updatedDescription = `Updated ${TestDataFactory.uniqueId()}`;

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: '25.00',
      description: originalExpense.description,
      date: originalExpense.date, // Use future date to ensure visibility in list
    });
    await expensesPage.expectExpenseVisible(originalExpense.description);

    // Act - edit the expense
    await expensesPage.clickEditOnExpense(originalExpense.description);
    await expenseForm.expectDescriptionValue(originalExpense.description);
    await expenseForm.updateExpense({ description: updatedDescription });

    // Assert
    await expenseForm.expectEditModalNotVisible();
    await expensesPage.expectExpenseVisible(updatedDescription);
  });
});

test.describe('Delete Expense', () => {
  test('should delete expense with confirmation', async ({ authenticatedPage }) => {
    // Arrange - create an expense first
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const expense = TestDataFactory.expense({ description: `Delete me ${TestDataFactory.uniqueId()}` });

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: '15.00',
      description: expense.description,
      date: expense.date, // Use future date to ensure visibility in list
    });
    await expensesPage.expectExpenseVisible(expense.description);

    // Act
    await expensesPage.clickDeleteOnExpense(expense.description);
    await expensesPage.expectDeleteModalVisible();
    await expensesPage.confirmDelete();

    // Assert
    await expensesPage.expectDeleteModalNotVisible();
    await expensesPage.expectExpenseNotVisible(expense.description);
  });

  test('should cancel delete operation', async ({ authenticatedPage }) => {
    // Arrange - create an expense first
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const expense = TestDataFactory.expense({ description: `Keep me ${TestDataFactory.uniqueId()}` });

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: '20.00',
      description: expense.description,
      date: expense.date, // Use future date to ensure visibility in list
    });
    await expensesPage.expectExpenseVisible(expense.description);

    // Act
    await expensesPage.clickDeleteOnExpense(expense.description);
    await expensesPage.expectDeleteModalVisible();
    await expensesPage.cancelDelete();

    // Assert
    await expensesPage.expectDeleteModalNotVisible();
    await expensesPage.expectExpenseVisible(expense.description);
  });
});
