/**
 * @fileoverview E2E tests for dashboard functionality
 *
 * Tests cover dashboard display, statistics, and recent expenses.
 *
 * @see frontend/src/pages/Dashboard.tsx
 */

import { test, expect } from '../../support';
import { DashboardPage } from '../../support';

test.describe('Dashboard Display', () => {
  test('should display dashboard heading', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await dashboardPage.expectLoaded();
  });

  test('should display monthly spending stat', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await expect(dashboardPage.monthlySpendingStat).toBeVisible();
  });

  test('should display total expenses count', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await expect(dashboardPage.totalExpensesStat).toBeVisible();
  });

  test('should display average per expense', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await expect(dashboardPage.avgPerExpenseStat).toBeVisible();
  });

  test('should display recent expenses section', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await dashboardPage.expectRecentExpensesVisible();
  });
});

test.describe('Stats Display', () => {
  test('should show dollar amounts with proper formatting', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Assert
    await dashboardPage.expectDollarFormatting();
  });
});

test.describe('Recent Expenses', () => {
  test('should display expense list if expenses exist', async ({ authenticatedPage }) => {
    // Wait for either expense list or empty state to appear (loading complete)
    const contentLocator = authenticatedPage.locator('ul.divide-y, .text-center.text-gray-500');
    await expect(contentLocator.first()).toBeVisible();

    // Assert - content is present
    const count = await contentLocator.count();
    expect(count).toBeGreaterThan(0);
  });
});
