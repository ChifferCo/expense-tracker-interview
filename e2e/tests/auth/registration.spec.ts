/**
 * @fileoverview E2E tests for user registration
 *
 * Tests cover the registration flow including mode switching,
 * form display, and successful registration.
 *
 * @see frontend/src/pages/Login.tsx
 */

import { test } from '@playwright/test';
import { LoginPage, DashboardPage, TestDataFactory } from '../../support';

test.describe('Registration', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.context().clearCookies();
    await loginPage.goto();
  });

  test('should switch to register mode', async () => {
    // Act
    await loginPage.switchToRegister();

    // Assert
    await loginPage.expectRegisterFormVisible();
  });

  test('should hide demo credentials in register mode', async () => {
    // Act
    await loginPage.switchToRegister();

    // Assert
    await loginPage.expectDemoHintNotVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    // Arrange
    const dashboardPage = new DashboardPage(page);
    const user = TestDataFactory.user();
    await loginPage.switchToRegister();

    // Act
    await loginPage.register(user.email, user.password);

    // Assert
    await dashboardPage.expectLoaded();
  });

  test('should switch back to login mode', async () => {
    // Arrange
    await loginPage.switchToRegister();
    await loginPage.expectRegisterFormVisible();

    // Act
    await loginPage.switchToLogin();

    // Assert
    await loginPage.expectLoginFormVisible();
  });
});
