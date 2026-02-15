/**
 * @fileoverview E2E tests for logout functionality
 *
 * Tests cover the logout flow and session management.
 *
 * @see frontend/src/pages/Login.tsx
 */

import { test } from '../../support';
import { LoginPage, DashboardPage } from '../../support';

test.describe('Logout', () => {
  test('should logout successfully', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);
    const loginPage = new LoginPage(authenticatedPage);

    // Act
    await dashboardPage.logout();

    // Assert
    await loginPage.expectLoginFormVisible();
  });
});

test.describe('Session Persistence', () => {
  test('should persist session after page reload', async ({ authenticatedPage }) => {
    // Arrange
    const dashboardPage = new DashboardPage(authenticatedPage);

    // Act
    await authenticatedPage.reload();

    // Assert
    await dashboardPage.expectLoaded();
  });
});
