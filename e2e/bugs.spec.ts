/**
 * @fileoverview Bug documentation tests
 * These tests document known bugs in the application.
 * Tests marked with .fail() are expected to fail, documenting the bug behavior.
 *
 * Bug tracking:
 * - BUG-001: Amount field accepts "e" character (scientific notation in number input)
 * - BUG-002: Future dates can be selected for expenses
 * - BUG-003: Dashboard delete button does nothing
 * - BUG-004: Date display off-by-one due to timezone handling
 */

import { test, expect } from '@playwright/test';

test.describe('Bug Documentation Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill('demo@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test.describe('BUG-001: Amount Field Validation', () => {
    /**
     * BUG: The amount input field accepts the "e" character because HTML number
     * inputs allow scientific notation (e.g., 1e5 = 100000). This can lead to
     * confusion or invalid data entry.
     *
     * Expected: Amount field should only accept numeric digits and decimal point
     * Actual: Amount field accepts "e" character for scientific notation
     */
    test('should reject "e" character in amount field', async ({ page }) => {
      // Navigate to expenses page
      await page.getByRole('link', { name: /expenses/i }).click();
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

      // Open create expense modal
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Arrange - try to enter "e" in amount field
      const amountInput = page.getByLabel('Amount');
      await amountInput.fill('1e2');

      // Act - check what value is accepted
      const value = await amountInput.inputValue();

      // Assert - "e" should not be accepted (BUG: it currently is)
      // This test documents the bug - it will fail because "e" IS accepted
      expect(value).not.toContain('e');
    });

    test('should not allow scientific notation in amount', async ({ page }) => {
      // Navigate to expenses page
      await page.getByRole('link', { name: /expenses/i }).click();
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Try to submit with scientific notation
      await page.getByLabel('Amount').fill('1e2');
      await page.getByLabel('Description').fill('Test scientific notation');
      await page.getByRole('button', { name: 'Create' }).click();

      // BUG: This will create an expense with amount 100 (1e2 = 100)
      // Expected: Should show validation error or reject the input
      await expect(page.getByText('Invalid amount')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('BUG-002: Future Date Selection', () => {
    /**
     * BUG: The date picker allows selecting future dates for expenses.
     * Expenses should only be for past or current dates.
     *
     * Expected: Future dates should be disabled or show validation error
     * Actual: Future dates are accepted without warning
     */
    test('should not allow future dates for expenses', async ({ page }) => {
      // Navigate to expenses page
      await page.getByRole('link', { name: /expenses/i }).click();
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Calculate a future date (1 year from now)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Try to enter a future date
      await page.getByLabel('Amount').fill('50');
      await page.getByLabel('Description').fill('Future expense test');
      await page.getByLabel('Date').fill(futureDateStr);
      await page.getByRole('button', { name: 'Create' }).click();

      // BUG: The expense is created with a future date
      // Expected: Should show validation error
      await expect(page.getByText(/future|invalid date/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('BUG-003: Dashboard Delete Button', () => {
    /**
     * BUG: The delete button on the dashboard's recent expenses list
     * does nothing when clicked. The onDelete handler is set to an empty function.
     *
     * Expected: Delete button should delete the expense or show confirmation
     * Actual: Delete button does nothing (onClick={() => {}})
     */
    test('should delete expense from dashboard', async ({ page }) => {
      // First, create an expense to delete
      await page.getByRole('link', { name: /expenses/i }).click();
      await page.getByRole('button', { name: /add expense/i }).click();
      const expenseDescription = `Dashboard delete test ${Date.now()}`;
      await page.getByLabel('Amount').fill('10');
      await page.getByLabel('Description').fill(expenseDescription);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText(expenseDescription)).toBeVisible({ timeout: 5000 });

      // Go back to dashboard
      await page.getByRole('link', { name: /dashboard/i }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Wait for recent expenses to load
      await expect(page.getByText(expenseDescription)).toBeVisible({ timeout: 5000 });

      // Try to delete from dashboard
      const expenseItem = page.locator('li', { hasText: expenseDescription });
      await expenseItem.getByRole('button', { name: 'Delete' }).click();

      // BUG: Nothing happens - the delete confirmation modal should appear
      // Expected: Delete confirmation modal should appear
      await expect(page.getByRole('heading', { name: 'Delete Expense' })).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('BUG-004: Date Timezone Bug', () => {
    /**
     * BUG: Dates may display incorrectly due to timezone handling.
     * When a date is saved as "2024-01-15", it might display as "Jan 14, 2024"
     * depending on the user's timezone.
     *
     * Expected: Date should display exactly as entered
     * Actual: Date may be off by one day due to UTC conversion
     */
    test('should display date exactly as entered', async ({ page }) => {
      // Navigate to expenses page
      await page.getByRole('link', { name: /expenses/i }).click();
      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();

      // Create expense with specific date
      const testDate = '2024-06-15'; // June 15, 2024
      const uniqueDesc = `Timezone test ${Date.now()}`;
      await page.getByLabel('Amount').fill('25');
      await page.getByLabel('Description').fill(uniqueDesc);
      await page.getByLabel('Date').fill(testDate);
      await page.getByRole('button', { name: 'Create' }).click();

      // Wait for expense to appear
      await expect(page.getByText(uniqueDesc)).toBeVisible({ timeout: 5000 });

      // Check the displayed date
      const expenseItem = page.locator('li', { hasText: uniqueDesc });
      const displayedDate = await expenseItem.textContent();

      // BUG: Date might show as "Jun 14, 2024" instead of "Jun 15, 2024"
      // Expected: Should show "Jun 15, 2024"
      expect(displayedDate).toContain('Jun 15');
    });
  });
});
