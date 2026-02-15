/**
 * @fileoverview E2E tests for dashboard functionality
 * Tests dashboard stats, navigation, and recent expenses
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill('demo@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Dashboard Display', () => {
    test('should display dashboard heading', async ({ page }) => {
      // Assert - dashboard heading is visible
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });

    test('should display monthly spending stat', async ({ page }) => {
      // Assert - monthly spending card is visible
      await expect(page.getByText(/Spending$/)).toBeVisible();
    });

    test('should display total expenses count', async ({ page }) => {
      // Assert - total expenses stat is visible
      await expect(page.getByText('Total Expenses')).toBeVisible();
    });

    test('should display average per expense', async ({ page }) => {
      // Assert - average stat is visible
      await expect(page.getByText('Avg per Expense')).toBeVisible();
    });

    test('should display recent expenses section', async ({ page }) => {
      // Assert - recent expenses heading is visible
      await expect(page.getByRole('heading', { name: 'Recent Expenses' })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to expenses page', async ({ page }) => {
      // Act - click expenses link
      await page.getByRole('link', { name: /expenses/i }).click();

      // Assert - expenses page is displayed
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    });

    test('should navigate to import page', async ({ page }) => {
      // Act - click import link
      await page.getByRole('link', { name: /import/i }).click();

      // Assert - import page is displayed (use exact match for h1)
      await expect(page.getByRole('heading', { name: 'Import Expenses', level: 1 })).toBeVisible();
    });

    test('should navigate back to dashboard', async ({ page }) => {
      // Arrange - go to expenses page
      await page.getByRole('link', { name: /expenses/i }).click();
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

      // Act - click dashboard link
      await page.getByRole('link', { name: /dashboard/i }).click();

      // Assert - back on dashboard
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });
  });

  test.describe('Stats Display', () => {
    test('should show dollar amounts with proper formatting', async ({ page }) => {
      // Assert - dollar signs are present in stats
      const monthlySpendingCard = page.locator('text=/\\$[0-9]+/');
      await expect(monthlySpendingCard.first()).toBeVisible();
    });
  });

  test.describe('Recent Expenses', () => {
    test('should display expense list if expenses exist', async ({ page }) => {
      // Wait for loading to complete
      await page.waitForTimeout(1000);

      // Check if there's either a loading state, expenses, or "no expenses" message
      const hasContent = await page.locator('table, [class*="text-gray-500"]').count();
      expect(hasContent).toBeGreaterThan(0);
    });
  });
});
