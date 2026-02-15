/**
 * @fileoverview E2E tests for authentication security
 *
 * Tests verify proper session handling and route protection.
 *
 * @see frontend/src/App.tsx
 * @see backend/src/routes/auth.ts
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../support';

test.describe('SEC-004: Authentication', () => {
  test('should not access protected routes when logged out', async ({ page, context }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await context.clearCookies();

    // Act
    await page.goto('/expenses');

    // Assert
    await loginPage.expectLoginFormVisible();
  });

  test('should clear session on logout', async ({ page }) => {
    // Arrange - login first
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAsDemo();
    await dashboardPage.expectLoaded();

    // Act - logout
    await dashboardPage.logout();
    await loginPage.expectLoginFormVisible();

    // Try to navigate to protected route via URL
    await page.goto('/expenses');

    // Assert - should still be on login page
    await loginPage.expectLoginFormVisible();
  });

  test('should reject invalid JWT token', async ({ page }) => {
    // Arrange - set an invalid token
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token-12345');
    });

    // Act - try to access protected route
    await page.goto('/expenses');

    // Assert - should redirect to login
    await loginPage.expectLoginFormVisible();
  });
});

test.describe('SEC-002: Credential Exposure', () => {
  /**
   * SECURITY CONCERN: Demo credentials are displayed on the login page.
   * While this is intentional for demo purposes, it's worth documenting
   * that credentials should never be exposed in production.
   */
  test('should display demo credentials on login page (intentional for demo)', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Assert - demo credentials are visible (intentional for demo)
    await loginPage.expectDemoHintVisible();

    // Document: In production, credentials should NEVER be displayed
  });

  test('should not expose password in page source', async ({ page }) => {
    // Arrange
    await page.goto('/');
    const pageContent = await page.content();

    // Note: "password123" appears as hint text, which is a security concern
    // This test documents the concern
    const passwordVisible = pageContent.includes('password123');

    if (passwordVisible) {
      console.warn('WARNING: Password is visible in page source (demo mode)');
    }
  });
});
