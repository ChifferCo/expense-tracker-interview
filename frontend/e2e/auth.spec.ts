import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AppLayout } from './pages/AppLayout.js';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('shows login form when not authenticated', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await expect(loginPage.headingSignIn).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitSignInButton).toBeVisible();
  });

  test('can toggle to register mode', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await expect(loginPage.headingSignIn).toBeVisible();
    await loginPage.switchToRegisterMode();
    await expect(loginPage.headingCreateAccount).toBeVisible();
    await expect(loginPage.submitRegisterButton).toBeVisible();
    await loginPage.switchToSignInMode();
    await expect(loginPage.headingSignIn).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('login with demo account redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('demo@example.com', 'password123');
    const dashboardPage = new DashboardPage(page);
    const layout = new AppLayout(page);
    await expect(dashboardPage.heading).toBeVisible({ timeout: 10000 });
    await expect(layout.appTitle).toBeVisible();
  });

  test('after login, logout returns to login screen', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('demo@example.com', 'password123');
    const dashboardPage = new DashboardPage(page);
    const layout = new AppLayout(page);
    await expect(dashboardPage.heading).toBeVisible({ timeout: 10000 });
    await layout.logout();
    await expect(loginPage.headingSignIn).toBeVisible({ timeout: 5000 });
  });

  test('register new user then login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const layout = new AppLayout(page);
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await loginPage.register(email, password);
    await expect(dashboardPage.heading).toBeVisible({ timeout: 10000 });

    await layout.logout();
    await expect(loginPage.headingSignIn).toBeVisible();

    await loginPage.login(email, password);
    await expect(dashboardPage.heading).toBeVisible({ timeout: 10000 });
  });
});
