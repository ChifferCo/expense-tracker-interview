import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for Expense Tracker.
 * Run backend (port 3002) and frontend (npm run dev, port 5173) before running tests:
 *   cd backend && npm run dev
 *   cd frontend && npm run dev
 * Then: npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  timeout: 15000,
  expect: { timeout: 5000 },
});
