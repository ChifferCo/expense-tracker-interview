import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Configuration for end-to-end tests using Playwright.
 * Tests are organized in the tests/ directory by feature area.
 *
 * ## Directory Structure
 * - support/ - Page objects, fixtures, and test utilities
 * - tests/ - Test files organized by category
 *   - auth/ - Authentication tests
 *   - dashboard/ - Dashboard tests
 *   - expenses/ - Expense management tests
 *   - navigation/ - Navigation and layout tests
 *   - security/ - Security tests
 *   - bugs/ - Bug documentation tests (expected to fail)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      url: 'http://localhost:3002/api/categories',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'cd ../frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
