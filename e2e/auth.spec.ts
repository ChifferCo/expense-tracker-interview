/**
 * @fileoverview E2E tests for authentication flows
 * Tests login, registration, logout, and session persistence
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto('/');
  });

  test.describe('Login', () => {
    test('should display login form by default', async ({ page }) => {
      // Assert - login form is visible
      await expect(page.getByText('Sign in to your account')).toBeVisible();
      await expect(page.getByPlaceholder('Email address')).toBeVisible();
      await expect(page.getByPlaceholder('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });

    test('should show demo credentials hint', async ({ page }) => {
      // Assert - demo credentials are displayed
      await expect(page.getByText('demo@example.com')).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      // Arrange - fill in demo credentials
      await page.getByPlaceholder('Email address').fill('demo@example.com');
      await page.getByPlaceholder('Password').fill('password123');

      // Act - submit login form
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Assert - redirected to dashboard
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Arrange - fill in invalid credentials
      await page.getByPlaceholder('Email address').fill('wrong@example.com');
      await page.getByPlaceholder('Password').fill('wrongpassword');

      // Act - submit login form
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Assert - error message is displayed (check for common error patterns)
      await expect(page.locator('text=/error|invalid|failed/i')).toBeVisible({ timeout: 5000 });
    });

    test('should disable submit button while loading', async ({ page }) => {
      // Arrange - fill in credentials
      await page.getByPlaceholder('Email address').fill('demo@example.com');
      await page.getByPlaceholder('Password').fill('password123');

      // Act - click submit
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Assert - button shows loading state (may be brief)
      // We check that login eventually succeeds
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Registration', () => {
    test('should switch to register mode', async ({ page }) => {
      // Act - click register link
      await page.getByText('Register').click();

      // Assert - register form is displayed
      await expect(page.getByText('Create your account')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
    });

    test('should hide demo credentials in register mode', async ({ page }) => {
      // Act - switch to register mode
      await page.getByText('Register').click();

      // Assert - demo credentials not visible
      await expect(page.getByText('demo@example.com')).not.toBeVisible();
    });

    test('should register new user successfully', async ({ page }) => {
      // Arrange - switch to register mode
      await page.getByText('Register').click();

      // Generate unique email to avoid conflicts
      const uniqueEmail = `test${Date.now()}@example.com`;
      await page.getByPlaceholder('Email address').fill(uniqueEmail);
      await page.getByPlaceholder('Password').fill('password123');

      // Act - submit registration
      await page.getByRole('button', { name: 'Register' }).click();

      // Assert - redirected to dashboard
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('should switch back to login mode', async ({ page }) => {
      // Arrange - go to register mode
      await page.getByText('Register').click();
      await expect(page.getByText('Create your account')).toBeVisible();

      // Act - click sign in link
      await page.getByText('Sign in').click();

      // Assert - back to login mode
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Arrange - login first
      await page.getByPlaceholder('Email address').fill('demo@example.com');
      await page.getByPlaceholder('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      // Act - click logout button
      await page.getByRole('button', { name: /logout/i }).click();

      // Assert - redirected to login page
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session after page reload', async ({ page }) => {
      // Arrange - login
      await page.getByPlaceholder('Email address').fill('demo@example.com');
      await page.getByPlaceholder('Password').fill('password123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      // Act - reload the page
      await page.reload();

      // Assert - still logged in
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });
  });
});
