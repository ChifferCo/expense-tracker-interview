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

  /**
   * Generates a date in the current month.
   * @returns Current month date string in YYYY-MM-DD format
   */
  currentMonthDate(): string {
    const now = new Date();
    // Use the 15th of the current month to avoid boundary issues
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
  },

  /**
   * Generates a date in the previous month.
   * @returns Previous month date string in YYYY-MM-DD format
   */
  previousMonthDate(): string {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    return prevMonth.toISOString().split('T')[0];
  },

  /**
   * Generates a date in a future month (not current month).
   * @returns Next month date string in YYYY-MM-DD format
   */
  nextMonthDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return nextMonth.toISOString().split('T')[0];
  },

  /**
   * Generates a date in a specific relative month.
   * @param monthsOffset - Positive for future, negative for past, 0 for current
   * @returns Date string in YYYY-MM-DD format
   */
  relativeMonthDate(monthsOffset: number): string {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsOffset, 15);
    return targetMonth.toISOString().split('T')[0];
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
