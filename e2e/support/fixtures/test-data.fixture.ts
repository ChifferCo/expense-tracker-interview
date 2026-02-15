/**
 * @fileoverview Test Data Fixtures
 *
 * Provides utilities for generating unique test data to ensure test isolation.
 * All test data includes timestamps or unique IDs to prevent collisions.
 *
 * @example
 * import { TestDataFactory } from '../support/fixtures/test-data.fixture';
 *
 * test('should create expense', async ({ page }) => {
 *   const expense = TestDataFactory.expense();
 *   await page.getByLabel('Description').fill(expense.description);
 * });
 */

/**
 * Factory for generating unique test data.
 * All generated data includes unique identifiers for test isolation.
 */
export const TestDataFactory = {
  /**
   * Generates a unique identifier based on timestamp and random string.
   * @returns Unique string identifier
   */
  uniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  },

  /**
   * Generates a future date for test data.
   * Uses future dates to ensure test expenses appear at the top of date-sorted lists.
   * This prevents test failures when the database has >50 expenses.
   * @returns Future date string in YYYY-MM-DD format
   */
  futureDate(): string {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 10); // 10 years in the future
    return future.toISOString().split('T')[0];
  },

  /**
   * Generates unique expense test data.
   * Uses a future date by default to ensure visibility in date-sorted lists.
   * @param overrides - Optional fields to override defaults
   * @returns Expense data with unique description
   */
  expense(overrides?: Partial<ExpenseData>): ExpenseData {
    const id = this.uniqueId();
    return {
      amount: '42.50',
      description: `Test expense ${id}`,
      date: this.futureDate(),
      ...overrides,
    };
  },

  /**
   * Generates unique user registration data.
   * @param overrides - Optional fields to override defaults
   * @returns User data with unique email
   */
  user(overrides?: Partial<UserData>): UserData {
    const id = this.uniqueId();
    return {
      email: `test-${id}@example.com`,
      password: 'password123',
      ...overrides,
    };
  },

  /**
   * Generates a unique search term for filtering tests.
   * @param prefix - Optional prefix for the search term
   * @returns Unique search string
   */
  searchTerm(prefix = 'search'): string {
    return `${prefix}-${this.uniqueId()}`;
  },
};

/** Expense data structure */
export interface ExpenseData {
  amount: string;
  description: string;
  date: string;
}

/** User data structure */
export interface UserData {
  email: string;
  password: string;
}
