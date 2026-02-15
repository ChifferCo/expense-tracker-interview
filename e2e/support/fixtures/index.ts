/**
 * @fileoverview Fixtures Index
 *
 * Re-exports all fixtures for convenient importing.
 *
 * @example
 * import { test, expect, TestDataFactory, DEMO_USER } from '../support/fixtures';
 */

export { test, expect, DEMO_USER } from './auth.fixture';
export { TestDataFactory } from './test-data.fixture';
export type { ExpenseData, UserData } from './test-data.fixture';
