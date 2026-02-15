/**
 * @fileoverview Support Layer Index
 *
 * Main entry point for all E2E test support utilities.
 * Re-exports fixtures and page objects for convenient importing.
 *
 * @example
 * import { test, expect, TestDataFactory, LoginPage, ExpensesPage } from '../support';
 */

// Fixtures
export { test, expect, DEMO_USER, TestDataFactory } from './fixtures';
export type { ExpenseData, UserData } from './fixtures';

// Page Objects
export { LoginPage, DashboardPage, ExpensesPage, ExpenseFormPage } from './page-objects';
