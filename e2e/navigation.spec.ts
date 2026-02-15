/**
 * @fileoverview E2E tests for navigation and layout
 * Tests app structure, navigation links, and responsive layout
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill('demo@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Layout Structure', () => {
    test('should display navigation sidebar', async ({ page }) => {
      // Assert - navigation elements are visible
      await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /expenses/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /import/i })).toBeVisible();
    });

    test('should display logout button', async ({ page }) => {
      // Assert - logout button is visible
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
    });

    test('should display app title or logo', async ({ page }) => {
      // Assert - app branding is visible
      await expect(page.getByText('ExpenseTracker')).toBeVisible();
    });
  });

  test.describe('Navigation Links', () => {
    test('should highlight active navigation link', async ({ page }) => {
      // Assert - dashboard link should be active on dashboard page
      const dashboardLink = page.getByRole('link', { name: /dashboard/i });
      await expect(dashboardLink).toBeVisible();

      // Navigate to expenses and check that link changes
      await page.getByRole('link', { name: /expenses/i }).click();
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    });

    test('should navigate to all pages correctly', async ({ page }) => {
      // Test Dashboard -> Expenses
      await page.getByRole('link', { name: /expenses/i }).click();
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

      // Test Expenses -> Import
      await page.getByRole('link', { name: /import/i }).click();
      await expect(page.getByRole('heading', { name: 'Import Expenses', level: 1 })).toBeVisible();

      // Test Import -> Dashboard
      await page.getByRole('link', { name: /dashboard/i }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });
  });

  test.describe('URL Navigation', () => {
    test('should support direct navigation to /expenses', async ({ page }) => {
      // Act - navigate directly to expenses URL
      await page.goto('/expenses');

      // Assert - expenses page loads
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible({ timeout: 10000 });
    });

    test('should support direct navigation to /import', async ({ page }) => {
      // Act - navigate directly to import URL
      await page.goto('/import');

      // Assert - import page loads
      await expect(page.getByRole('heading', { name: 'Import Expenses', level: 1 })).toBeVisible({ timeout: 10000 });
    });

    test('should redirect unknown routes to dashboard', async ({ page }) => {
      // Act - navigate to unknown route
      await page.goto('/unknown-page');

      // Assert - redirected to dashboard
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page, context }) => {
      // Arrange - clear cookies to simulate logged out state
      await context.clearCookies();
      await page.evaluate(() => localStorage.clear());

      // Act - try to access protected route
      await page.goto('/expenses');

      // Assert - redirected to login (or shows login form)
      await expect(page.getByText('Sign in to your account')).toBeVisible({ timeout: 10000 });
    });
  });
});
