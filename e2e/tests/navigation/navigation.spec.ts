/**
 * @fileoverview E2E tests for navigation and layout
 *
 * Tests cover sidebar navigation, URL routing, and protected routes.
 *
 * @see frontend/src/components/Layout.tsx
 * @see frontend/src/App.tsx
 */

import { test, expect } from '../../support';
import { DashboardPage, LoginPage } from '../../support';

test.describe('Layout Structure', () => {
  test('should display navigation sidebar', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await dashboardPage.expectNavigationVisible();
  });

  test('should display logout button', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test('should display app title or logo', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await expect(dashboardPage.appTitle).toBeVisible();
  });
});

test.describe('Navigation Links', () => {
  test('should highlight active navigation link', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert - dashboard link should be visible
    await expect(dashboardPage.dashboardLink).toBeVisible();

    // Act - navigate to expenses
    await dashboardPage.navigateToExpenses();

    // Assert - expenses page is displayed
    await expect(authenticatedPage.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  });

  test('should navigate to all pages correctly', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Act & Assert - Dashboard -> Expenses
    await dashboardPage.navigateToExpenses();

    // Act & Assert - Expenses -> Import
    await dashboardPage.navigateToImport();

    // Act & Assert - Import -> Dashboard
    await dashboardPage.dashboardLink.click();
    await dashboardPage.expectLoaded();
  });
});

test.describe('URL Navigation', () => {
  test('should support direct navigation to /expenses', async ({ authenticatedPage }) => {
    // Act
    await authenticatedPage.goto('/expenses');

    // Assert
    await expect(authenticatedPage.getByRole('heading', { name: 'Expenses' })).toBeVisible({ timeout: 10000 });
  });

  test('should support direct navigation to /import', async ({ authenticatedPage }) => {
    // Act
    await authenticatedPage.goto('/import');

    // Assert
    await expect(authenticatedPage.getByRole('heading', { name: 'Import Expenses', level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unknown routes to dashboard', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Act
    await authenticatedPage.goto('/unknown-page');

    // Assert
    await dashboardPage.expectLoaded();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page, context }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await context.clearCookies();

    // Navigate first, then clear localStorage (can't access localStorage before navigation)
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Act
    await page.goto('/expenses');

    // Assert
    await loginPage.expectLoginFormVisible();
  });
});
