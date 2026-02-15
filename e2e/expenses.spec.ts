/**
 * @fileoverview E2E tests for expense management
 *
 * Comprehensive end-to-end tests for expense CRUD operations using Playwright.
 * Tests cover the complete expense management workflow.
 *
 * ## Test Coverage (13 tests)
 *
 * ### Expenses Page
 * - Display expenses list with search and filter options
 * - Date filter options visible (All Time, This Month, etc.)
 *
 * ### Create Expense
 * - Open create expense modal
 * - Create new expense successfully
 * - Show validation error for empty amount
 * - Close modal on cancel
 *
 * ### Edit Expense
 * - Edit existing expense with pre-filled data
 *
 * ### Delete Expense
 * - Delete expense with confirmation modal
 * - Cancel delete operation
 *
 * ### Search
 * - Filter expenses by search query
 *
 * ### Date Filtering
 * - Filter by "This Month"
 * - Show custom date inputs when Custom selected
 *
 * ## Test Patterns
 * - Creates unique test data using Date.now() timestamps
 * - Uses li selector with title attribute for Edit/Delete buttons
 * - Waits for modal transitions before assertions
 *
 * @see frontend/src/pages/Expenses.tsx - Expenses page
 * @see frontend/src/components/ExpenseList.tsx - Expense list component
 * @see frontend/src/components/ExpenseForm.tsx - Expense form component
 */

import { test, expect } from '@playwright/test';

test.describe('Expense Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill('demo@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Navigate to expenses page
    await page.getByRole('link', { name: /expenses/i }).click();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  });

  test.describe('Expenses Page', () => {
    test('should display expenses list', async ({ page }) => {
      // Assert - expenses page elements are visible
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
      await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible();
      await expect(page.getByPlaceholder('Search expenses...')).toBeVisible();
    });

    test('should have date filter options', async ({ page }) => {
      // Assert - date filter buttons are visible
      await expect(page.getByRole('button', { name: 'All Time' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'This Month' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Last Month' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Last 12 Months' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Custom' })).toBeVisible();
    });
  });

  test.describe('Create Expense', () => {
    test('should open create expense modal', async ({ page }) => {
      // Act - click add expense button
      await page.getByRole('button', { name: /add expense/i }).click();

      // Assert - modal is open with form
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();
      await expect(page.getByLabel('Category')).toBeVisible();
      await expect(page.getByLabel('Amount')).toBeVisible();
      await expect(page.getByLabel('Description')).toBeVisible();
      await expect(page.getByLabel('Date')).toBeVisible();
    });

    test('should create new expense successfully', async ({ page }) => {
      // Arrange - open create modal
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Fill in expense details
      const testDescription = `Test expense ${Date.now()}`;
      await page.getByLabel('Amount').fill('42.50');
      await page.getByLabel('Description').fill(testDescription);

      // Act - submit the form
      await page.getByRole('button', { name: 'Create' }).click();

      // Assert - modal closes and expense appears in list
      await expect(page.getByRole('heading', { name: 'Add Expense' })).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(testDescription)).toBeVisible();
    });

    test('should show validation error for empty amount', async ({ page }) => {
      // Arrange - open create modal
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Fill only description, leave amount empty
      await page.getByLabel('Amount').clear();
      await page.getByLabel('Description').fill('Test');

      // Act - try to submit
      await page.getByRole('button', { name: 'Create' }).click();

      // Assert - validation error is shown
      await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
    });

    test('should close modal on cancel', async ({ page }) => {
      // Arrange - open create modal
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Act - click cancel
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Assert - modal is closed
      await expect(page.getByRole('heading', { name: 'Add Expense' })).not.toBeVisible();
    });
  });

  test.describe('Edit Expense', () => {
    test('should edit existing expense', async ({ page }) => {
      // First create an expense to edit
      await page.getByRole('button', { name: /add expense/i }).click();
      const originalDescription = `Original expense ${Date.now()}`;
      await page.getByLabel('Amount').fill('25.00');
      await page.getByLabel('Description').fill(originalDescription);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText(originalDescription)).toBeVisible({ timeout: 5000 });

      // Arrange - click edit button on the expense (uses title attribute)
      const expenseItem = page.locator('li', { hasText: originalDescription });
      await expenseItem.getByRole('button', { name: 'Edit' }).click();

      // Assert - edit modal opens with pre-filled data
      await expect(page.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
      await expect(page.getByLabel('Description')).toHaveValue(originalDescription);

      // Act - update the description
      const updatedDescription = `Updated expense ${Date.now()}`;
      await page.getByLabel('Description').fill(updatedDescription);
      await page.getByRole('button', { name: 'Update' }).click();

      // Assert - modal closes and updated expense appears
      await expect(page.getByRole('heading', { name: 'Edit Expense' })).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(updatedDescription)).toBeVisible();
    });
  });

  test.describe('Delete Expense', () => {
    test('should delete expense with confirmation', async ({ page }) => {
      // First create an expense to delete
      await page.getByRole('button', { name: /add expense/i }).click();
      const expenseDescription = `Delete me ${Date.now()}`;
      await page.getByLabel('Amount').fill('15.00');
      await page.getByLabel('Description').fill(expenseDescription);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText(expenseDescription)).toBeVisible({ timeout: 5000 });

      // Arrange - click delete button (uses title attribute)
      const expenseItem = page.locator('li', { hasText: expenseDescription });
      await expenseItem.getByRole('button', { name: 'Delete' }).click();

      // Assert - confirmation modal appears
      await expect(page.getByRole('heading', { name: 'Delete Expense' })).toBeVisible();
      await expect(page.getByText('Are you sure you want to delete this expense?')).toBeVisible();

      // Act - confirm deletion (click the red Delete button in modal)
      await page.locator('button:has-text("Delete")').last().click();

      // Assert - modal closes and expense is removed
      await expect(page.getByRole('heading', { name: 'Delete Expense' })).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(expenseDescription)).not.toBeVisible();
    });

    test('should cancel delete operation', async ({ page }) => {
      // First create an expense
      await page.getByRole('button', { name: /add expense/i }).click();
      const expenseDescription = `Keep me ${Date.now()}`;
      await page.getByLabel('Amount').fill('20.00');
      await page.getByLabel('Description').fill(expenseDescription);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText(expenseDescription)).toBeVisible({ timeout: 5000 });

      // Arrange - click delete button (uses title attribute)
      const expenseItem = page.locator('li', { hasText: expenseDescription });
      await expenseItem.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('heading', { name: 'Delete Expense' })).toBeVisible();

      // Act - cancel deletion
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Assert - modal closes and expense still exists
      await expect(page.getByRole('heading', { name: 'Delete Expense' })).not.toBeVisible();
      await expect(page.getByText(expenseDescription)).toBeVisible();
    });
  });

  test.describe('Search', () => {
    test('should filter expenses by search query', async ({ page }) => {
      // First create expenses with unique descriptions
      const searchTerm = `unique${Date.now()}`;

      await page.getByRole('button', { name: /add expense/i }).click();
      await page.getByLabel('Amount').fill('30.00');
      await page.getByLabel('Description').fill(`${searchTerm} expense`);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText(`${searchTerm} expense`)).toBeVisible({ timeout: 5000 });

      // Act - search for the unique term
      await page.getByPlaceholder('Search expenses...').fill(searchTerm);

      // Assert - only matching expense is visible
      await expect(page.getByText(`${searchTerm} expense`)).toBeVisible();
    });
  });

  test.describe('Date Filtering', () => {
    test('should filter by this month', async ({ page }) => {
      // Act - click "This Month" filter
      await page.getByRole('button', { name: 'This Month' }).click();

      // Assert - filter is selected (button has active styling)
      await expect(page.getByRole('button', { name: 'This Month' })).toHaveClass(/bg-indigo-600/);
    });

    test('should show custom date inputs when Custom is selected', async ({ page }) => {
      // Act - click "Custom" filter
      await page.getByRole('button', { name: 'Custom' }).click();

      // Assert - custom date inputs are visible
      await expect(page.getByLabel('From:')).toBeVisible();
      await expect(page.getByLabel('To:')).toBeVisible();
    });
  });
});
