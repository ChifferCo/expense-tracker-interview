/**
 * @fileoverview Authentication Fixtures
 *
 * Provides pre-authenticated test contexts to skip login flows in tests.
 * Uses Playwright's fixture system to extend the base test with auth state.
 *
 * @example
 * // Use in tests:
 * import { test, expect } from '../support/fixtures/auth.fixture';
 *
 * test('should access dashboard', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/');
 *   await expect(authenticatedPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
 * });
 */

import { test as base, expect, Page } from '@playwright/test';

/** Demo user credentials */
export const DEMO_USER = {
  email: 'demo@example.com',
  password: 'password123',
} as const;

/** Extended test fixtures with authentication support */
type AuthFixtures = {
  /** Pre-authenticated page - already logged in as demo user */
  authenticatedPage: Page;
};

/**
 * Extended test with authentication fixtures.
 * Use this instead of the base Playwright test for tests requiring authentication.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/');

    // Perform login
    await page.getByPlaceholder('Email address').fill(DEMO_USER.email);
    await page.getByPlaceholder('Password').fill(DEMO_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for dashboard to confirm login success
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Provide the authenticated page to the test
    await use(page);
  },
});

export { expect };
