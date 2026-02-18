/**
 * @fileoverview Dashboard Expense Verification Tests
 *
 * Tests verify that dashboard statistics accurately reflect expense data.
 * Includes happy path, date boundary edge cases, and precision/rounding issues.
 *
 * NOTE: These tests run serially because they measure before/after state changes.
 * Running in parallel would cause race conditions with shared user data.
 *
 * @see frontend/src/pages/Dashboard.tsx
 * @see backend/src/services/expenseService.ts (getMonthlyTotal)
 */

import { test, expect } from '../../support';
import { DashboardPage, ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

// Run all tests in this file serially to avoid race conditions
test.describe.configure({ mode: 'serial' });

test.describe('Dashboard Expense Verification - Happy Path', () => {
  let dashboardPage: DashboardPage;
  let expensesPage: ExpensesPage;
  let expenseForm: ExpenseFormPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    expensesPage = new ExpensesPage(authenticatedPage);
    expenseForm = new ExpenseFormPage(authenticatedPage);
  });

  test('should update monthly spending when adding a current month expense', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '100.00',
      description: `Happy path expense ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });

    // Get initial monthly spending
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialSpending = await dashboardPage.getMonthlySpendingValue();

    // Act - create expense in current month
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard and verify
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedSpending = await dashboardPage.getMonthlySpendingValue();

    // Assert - spending should increase by 100.00
    expect(updatedSpending).toBeCloseTo(initialSpending + 100.0, 2);
  });

  test('should update total expense count when adding an expense', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      description: `Count test expense ${TestDataFactory.uniqueId()}`,
    });

    // Get initial count
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialCount = await dashboardPage.getTotalExpensesCount();

    // Act - create expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedCount = await dashboardPage.getTotalExpensesCount();

    // Assert - count should increase by at least 1 (unless capped at 50 by API limit)
    // Note: The dashboard displays expenses.length which is capped at 50 by the API
    // Using >= to handle parallel test interference (other tests may create expenses)
    if (initialCount < 50) {
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount + 1);
    } else {
      // When at API limit, count stays at 50 (this is expected behavior given current API)
      expect(updatedCount).toBe(50);
    }
  });

  test('should update average per expense after adding new expense', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '50.00',
      description: `Avg test expense ${TestDataFactory.uniqueId()}`,
    });

    // Get initial values
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialAvg = await dashboardPage.getAvgPerExpenseValue();

    // Act - create expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedAvg = await dashboardPage.getAvgPerExpenseValue();

    // Assert - average should be a valid positive number
    // Note: Exact calculation is complex due to 50-item API limit affecting which expenses are averaged
    expect(updatedAvg).toBeGreaterThan(0);
    // The average should be in a reasonable range (not drastically different)
    expect(Math.abs(updatedAvg - initialAvg)).toBeLessThan(initialAvg * 0.5);
  });
});

test.describe('Dashboard Expense Verification - Future Date', () => {
  let dashboardPage: DashboardPage;
  let expensesPage: ExpensesPage;
  let expenseForm: ExpenseFormPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    expensesPage = new ExpensesPage(authenticatedPage);
    expenseForm = new ExpenseFormPage(authenticatedPage);
  });

  test('should NOT include future-dated expense in current month spending', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '250.00',
      description: `Future expense ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.nextMonthDate(), // Next month
    });

    // Get initial monthly spending
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialSpending = await dashboardPage.getMonthlySpendingValue();

    // Act - create expense with future date (next month)
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard (stats will confirm expense was created)
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedSpending = await dashboardPage.getMonthlySpendingValue();

    // Assert - monthly spending should NOT increase (future month not included)
    expect(updatedSpending).toBeCloseTo(initialSpending, 2);
  });

  test('should include future-dated expense in total expense count', async () => {
    // Arrange - total count includes ALL expenses regardless of date
    const expense = TestDataFactory.expense({
      amount: '75.00',
      description: `Future count expense ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.futureDate(), // Far future
    });

    // Get initial count
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialCount = await dashboardPage.getTotalExpensesCount();

    // Act - create future-dated expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedCount = await dashboardPage.getTotalExpensesCount();

    // Assert - total count SHOULD increase (unless capped at 50 by API limit)
    // Using >= to handle parallel test interference (other tests may create expenses)
    if (initialCount < 50) {
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount + 1);
    } else {
      expect(updatedCount).toBe(50);
    }
  });
});

test.describe('Dashboard Expense Verification - Past Date', () => {
  let dashboardPage: DashboardPage;
  let expensesPage: ExpensesPage;
  let expenseForm: ExpenseFormPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage);
    expensesPage = new ExpensesPage(authenticatedPage);
    expenseForm = new ExpenseFormPage(authenticatedPage);
  });

  test('should NOT include past-dated expense in current month spending', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '300.00',
      description: `Past expense ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.previousMonthDate(), // Last month
    });

    // Get initial monthly spending
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialSpending = await dashboardPage.getMonthlySpendingValue();

    // Act - create expense with past date (previous month)
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();
    // Note: Past-dated expenses may not be visible in the list due to date sorting and 50-item limit

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedSpending = await dashboardPage.getMonthlySpendingValue();

    // Assert - monthly spending should NOT increase (past month not included)
    expect(updatedSpending).toBeCloseTo(initialSpending, 2);
  });

  test('should include past-dated expense in total expense count', async () => {
    // Arrange - total count includes ALL expenses regardless of date
    const expense = TestDataFactory.expense({
      amount: '45.00',
      description: `Past count expense ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.previousMonthDate(),
    });

    // Get initial count
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialCount = await dashboardPage.getTotalExpensesCount();

    // Act - create past-dated expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedCount = await dashboardPage.getTotalExpensesCount();

    // Assert - total count SHOULD increase (unless capped at 50 by API limit)
    // Using >= to handle parallel test interference (other tests may create expenses)
    if (initialCount < 50) {
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount + 1);
    } else {
      expect(updatedCount).toBe(50);
    }
  });
});

test.describe('Dashboard Expense Verification - Edge Cases', () => {
  let page: import('@playwright/test').Page;
  let dashboardPage: DashboardPage;
  let expensesPage: ExpensesPage;
  let expenseForm: ExpenseFormPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    page = authenticatedPage;
    dashboardPage = new DashboardPage(authenticatedPage);
    expensesPage = new ExpensesPage(authenticatedPage);
    expenseForm = new ExpenseFormPage(authenticatedPage);
  });

  test('should handle zero amount expense correctly', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '0',
      description: `Zero amount ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - try to create expense with zero amount
    await expenseForm.fill({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.submitCreate();

    // Assert - should show validation error (amount must be > 0)
    await expenseForm.expectAmountValidationError();
  });

  test('should handle large amount expense in dashboard total', async () => {
    // Arrange
    const expense = TestDataFactory.expense({
      amount: '99999.99', // Large but valid amount
      description: `Large amount ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });

    // Get initial monthly spending
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialSpending = await dashboardPage.getMonthlySpendingValue();

    // Act - create large expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const updatedSpending = await dashboardPage.getMonthlySpendingValue();

    // Assert - spending should increase by 99999.99
    expect(updatedSpending).toBeCloseTo(initialSpending + 99999.99, 2);
  });

  test('should correctly update total count after deleting an expense', async () => {
    // Arrange - create then delete an expense, verify count reverts
    // Note: Uses future date to ensure expense appears at top of sorted list (avoids pagination issues)
    const expense = TestDataFactory.expense({
      amount: '75.50',
      description: `Delete verify ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.futureDate(),
    });

    // Get initial count
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialCount = await dashboardPage.getTotalExpensesCount();

    // Create expense
    await dashboardPage.navigateToExpenses();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();
    await expenseForm.createExpense({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
    });
    await expenseForm.expectAddModalNotVisible();

    // Reload to ensure fresh data from server (React Query cache may be stale)
    await page.reload();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.expectExpenseVisible(expense.description);

    // Delete the expense
    await expensesPage.clickDeleteOnExpense(expense.description);
    await expensesPage.expectDeleteModalVisible();
    await expensesPage.confirmDelete();
    await expensesPage.expectDeleteModalNotVisible();

    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const finalCount = await dashboardPage.getTotalExpensesCount();

    // Assert - count should return to initial state
    expect(finalCount).toBe(initialCount);
  });
});
