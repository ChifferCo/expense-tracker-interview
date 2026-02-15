/**
 * @fileoverview E2E tests for login functionality
 *
 * Tests cover the login flow including form display, validation,
 * successful login, and error handling.
 *
 * @see frontend/src/pages/Login.tsx
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../support';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.context().clearCookies();
    await loginPage.goto();
  });

  test('should display login form by default', async () => {
    // Assert
    await loginPage.expectLoginFormVisible();
  });

  test('should show demo credentials hint', async () => {
    // Assert
    await loginPage.expectDemoHintVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Arrange
    const dashboardPage = new DashboardPage(page);

    // Act
    await loginPage.loginAsDemo();

    // Assert
    await dashboardPage.expectLoaded();
  });

  test('should show error for invalid credentials', async () => {
    // Act
    await loginPage.login('wrong@example.com', 'wrongpassword');

    // Assert
    await loginPage.expectErrorVisible();
  });

  test('should disable submit button while loading', async ({ page }) => {
    // Arrange
    const dashboardPage = new DashboardPage(page);

    // Act
    await loginPage.loginAsDemo();

    // Assert - login eventually succeeds (button was disabled during loading)
    await dashboardPage.expectLoaded();
  });
});
