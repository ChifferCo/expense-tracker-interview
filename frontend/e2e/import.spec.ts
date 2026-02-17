import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ImportPage } from './pages/ImportPage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsvPath = path.join(__dirname, 'fixtures', 'sample-expenses.csv');

test.describe('Import', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');
    await dashboardPage.expectDashboardVisible(10000);
    const importPage = new ImportPage(page);
    await importPage.goto();
    await importPage.expectImportPageVisible();
  });

  test('shows import page with start import and history', async ({ page }) => {
    const importPage = new ImportPage(page);
    await expect(importPage.bulkImportHeading).toBeVisible();
    await expect(importPage.startImportButton).toBeVisible();
    await expect(importPage.importHistoryHeading).toBeVisible();
  });

  test('opening wizard shows upload step', async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.openWizard();
    await importPage.expectWizardUploadVisible(5000);
    await importPage.cancelWizard();
    await expect(importPage.heading).toBeVisible();
  });

  test('uploading CSV moves to mapping step', async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.openWizard();
    await importPage.expectWizardUploadVisible(5000);
    await importPage.uploadCsv(sampleCsvPath);
    await importPage.expectWizardMappingVisible(10000);
  });
});
