/**
 * @fileoverview Bug Documentation Tests - Precision/Rounding Display
 *
 * These tests document known bugs and edge cases in how the UI handles amount values.
 *
 * ## BUG-001 (Extended): Scientific Notation Accepted Without Validation
 *
 * **Issue:** When a user enters scientific notation like "1e2", the HTML number input
 * accepts it and JavaScript's Number() converts it to 100. No validation error is shown.
 *
 * **Expected:** UI should show a validation error for non-standard numeric formats
 * **Actual:** "1e2" is silently converted to 100 and expense is created
 *
 * ## Design Note: HTML step="0.01" prevents high-precision input
 *
 * The amount input has step="0.01" which prevents entering values like 0.015 or 0.005.
 * Browser validation blocks form submission for values that don't conform to the step.
 * This is arguably correct behavior for a currency input, but the .toFixed(2) rounding
 * in display code would still cause issues if high-precision values entered the system
 * via API or data import.
 *
 * **Affected Files:**
 * - frontend/src/components/ExpenseForm.tsx (step="0.01" on amount input)
 * - frontend/src/pages/Dashboard.tsx (uses .toFixed(2) for display)
 * - frontend/src/components/ExpenseList.tsx (uses .toFixed(2) for display)
 *
 * @see frontend/src/pages/Dashboard.tsx
 * @see e2e/tests/bugs/amount-validation.spec.ts - Related BUG-001 tests
 */

import { test } from '../../support';
import { ExpensesPage, ExpenseFormPage, TestDataFactory } from '../../support';

test.describe('BUG-001: Scientific Notation Handling', () => {
  /**
   * Scientific notation (e.g., 1e2) should be rejected as invalid input format.
   *
   * **BUG:** Currently "1e2" is silently converted to 100 and the expense is created.
   *
   * **Expected:** Validation error should appear, form should not submit
   * **Actual:** Form submits successfully with converted value (100)
   *
   * This test asserts CORRECT behavior and is EXPECTED TO FAIL until the bug is fixed.
   */
  test('should reject scientific notation in amount field', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - enter scientific notation
    await expenseForm.fill({
      amount: '1e2',
      description: `Scientific notation ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });
    await expenseForm.submitCreate();

    // Assert - SHOULD show validation error and modal should remain open
    // BUG: Currently accepts "1e2" as 100 and closes the modal
    // This assertion will FAIL until the bug is fixed
    await expenseForm.expectAddModalVisible();
  });

  /**
   * Scientific notation with decimal (e.g., 1.5e2) should also be rejected.
   *
   * **BUG:** "1.5e2" is silently converted to 150.
   *
   * This test asserts CORRECT behavior and is EXPECTED TO FAIL until the bug is fixed.
   */
  test('should reject scientific notation with decimal component', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - enter scientific notation with decimal
    await expenseForm.fill({
      amount: '1.5e2',
      description: `Decimal sci notation ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });
    await expenseForm.submitCreate();

    // Assert - SHOULD show validation error and modal should remain open
    // BUG: Currently accepts "1.5e2" as 150 and closes the modal
    await expenseForm.expectAddModalVisible();
  });
});

test.describe('BUG: Expense List Rounding', () => {
  /**
   * When expenses with high-precision values are stored (via API/import),
   * the UI should display the exact stored values. Instead, it rounds them.
   *
   * **BUG:** UI uses .toFixed(2) in ExpenseList.tsx and Dashboard.tsx
   *
   * **Example:**
   * - Stored value: 100.995
   * - Expected display: $100.995
   * - Actual display: $101.00 (rounded by .toFixed(2))
   *
   * This test creates expenses via API to bypass HTML step validation,
   * then verifies the rounding bug exists in both:
   * 1. Expense list (individual expense display)
   * 2. Dashboard totals (aggregate calculations)
   *
   * EXPECTED TO FAIL until the bug is fixed.
   */
  test('should display exact amounts in expense list without rounding', async ({ authenticatedPage }) => {
    // Arrange - create expense via API with high-precision amount
    const token = await authenticatedPage.evaluate(() => localStorage.getItem('token'));
    const uniqueId = TestDataFactory.uniqueId();

    // Create expense that demonstrates the rounding issue
    // 100.995 should display as $100.995, but .toFixed(2) rounds to $101.00
    const expense = {
      amount: 100.995,
      description: `Rounding test ${uniqueId}`,
    };

    const response = await authenticatedPage.request.post('/api/expenses', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        categoryId: 1,
        amount: expense.amount,
        description: expense.description,
        date: TestDataFactory.futureDate(), // Future date ensures visibility at top of sorted list
      },
    });
    if (!response.ok()) {
      throw new Error(`Failed to create expense: ${await response.text()}`);
    }

    // Navigate to expenses page
    const expensesPage = new ExpensesPage(authenticatedPage);
    await expensesPage.goto(); // This includes selectDateFilter('allTime')

    // Search for our unique expense
    await expensesPage.search(uniqueId);

    // Find the expense item by its description (waitFor handles the search debounce)
    const expenseItem = expensesPage.getExpenseItem(expense.description);
    await expenseItem.waitFor({ state: 'visible', timeout: 10000 });

    // Get the displayed amount text from the expense item
    // Structure: <li> contains <span class="text-sm font-semibold text-gray-900">$XXX.XX</span>
    const amountSpan = expenseItem.locator('span.font-semibold');
    const displayedAmount = await amountSpan.textContent();

    // BUG: UI shows $101.00 instead of $100.995 due to .toFixed(2)
    // This test asserts CORRECT behavior and is EXPECTED TO FAIL until the bug is fixed
    if (!displayedAmount?.includes('100.995')) {
      throw new Error(
        `Expense list rounding bug: Stored 100.995, displayed ${displayedAmount}. ` +
          `Expected: $100.995, Actual: ${displayedAmount}. ` +
          `The ExpenseList.tsx uses .toFixed(2) which rounds values.`
      );
    }
  });
});

test.describe('BUG: Dashboard Totals Rounding', () => {
  /**
   * Dashboard totals should show exact sums, not rounded intermediate values.
   *
   * When 100.995 + 100.249 = 201.244 are stored, the dashboard should show $201.244 (or $201.24 if consistent rounding).
   * But if each value is rounded before summing, we might get 101.00 + 100.25 = 201.25 which is wrong.
   *
   * EXPECTED TO FAIL until the bug is fixed.
   */
  test('should display exact totals on dashboard without rounding errors', async ({ authenticatedPage }) => {
    // Arrange - create expenses via API
    const token = await authenticatedPage.evaluate(() => localStorage.getItem('token'));
    const uniqueId = TestDataFactory.uniqueId();

    // These two amounts sum to exactly 201.244
    const expense1 = { amount: 100.995, description: `Dashboard test A ${uniqueId}` };
    const expense2 = { amount: 100.249, description: `Dashboard test B ${uniqueId}` };
    const expectedSum = 201.244; // 100.995 + 100.249

    // Get initial dashboard spending
    const { DashboardPage } = await import('../../support');
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.waitForDataLoaded();
    const initialSpending = await dashboardPage.getMonthlySpendingValue();

    // Create expenses in current month
    for (const exp of [expense1, expense2]) {
      const response = await authenticatedPage.request.post('/api/expenses', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          categoryId: 1,
          amount: exp.amount,
          description: exp.description,
          date: TestDataFactory.currentMonthDate(),
        },
      });
      if (!response.ok()) {
        throw new Error(`Failed to create expense: ${await response.text()}`);
      }
    }

    // Refresh dashboard to see new totals
    await authenticatedPage.reload({ waitUntil: 'networkidle' });
    await dashboardPage.waitForDataLoaded();
    const updatedSpending = await dashboardPage.getMonthlySpendingValue();

    // The increase should be exactly 201.244 (100.995 + 100.249)
    const actualIncrease = updatedSpending - initialSpending;

    // BUG: Dashboard uses .toFixed(2) which may show 201.24 or 201.25 instead of 201.244
    // Using toBeCloseTo with precision 3 will fail if rounding occurred
    if (Math.abs(actualIncrease - expectedSum) > 0.001) {
      throw new Error(
        `Dashboard rounding bug: Expected increase of $${expectedSum.toFixed(3)}, ` +
          `but got $${actualIncrease.toFixed(3)}. ` +
          `The dashboard rounds values using .toFixed(2) instead of displaying exact totals.`
      );
    }
  });
});

test.describe('Amount Input Step Validation', () => {
  /**
   * Documents that HTML step="0.01" validation prevents high-precision values.
   * The browser rejects values like 0.015 that don't conform to the step increment.
   *
   * This is actually CORRECT behavior for currency input, preventing the
   * .toFixed(2) display rounding issue from occurring in normal UI use.
   */
  test('should reject amounts with more than 2 decimal places due to step validation', async ({
    authenticatedPage,
  }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);

    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Act - try to enter a value with 3 decimal places
    await expenseForm.fill({
      amount: '10.015',
      description: `Step test ${TestDataFactory.uniqueId()}`,
      date: TestDataFactory.currentMonthDate(),
    });
    await expenseForm.submitCreate();

    // Assert - modal should remain open because browser validation blocks submission
    // The step="0.01" on the input prevents values that don't conform
    await expenseForm.expectAddModalVisible();
  });

  /**
   * Verifies that standard 2-decimal values are accepted normally.
   */
  test('should accept amounts with exactly 2 decimal places', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const description = `Two decimal ${TestDataFactory.uniqueId()}`;

    await expensesPage.goto();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();

    // Act - enter a value with exactly 2 decimal places
    await expenseForm.fill({
      amount: '25.99',
      description,
      date: TestDataFactory.currentMonthDate(),
    });
    await expenseForm.submitCreate();

    // Assert - should be accepted
    await expenseForm.expectAddModalNotVisible();
    await expensesPage.expectExpenseVisible(description);
  });

  /**
   * Verifies that whole number amounts are accepted.
   */
  test('should accept whole number amounts', async ({ authenticatedPage }) => {
    // Arrange
    const expensesPage = new ExpensesPage(authenticatedPage);
    const expenseForm = new ExpenseFormPage(authenticatedPage);
    const description = `Whole number ${TestDataFactory.uniqueId()}`;

    await expensesPage.goto();
    await expensesPage.selectDateFilter('allTime');
    await expensesPage.openAddExpenseModal();

    // Act - enter a whole number
    await expenseForm.fill({
      amount: '100',
      description,
      date: TestDataFactory.currentMonthDate(),
    });
    await expenseForm.submitCreate();

    // Assert - should be accepted
    await expenseForm.expectAddModalNotVisible();
    await expensesPage.expectExpenseVisible(description);
  });
});
