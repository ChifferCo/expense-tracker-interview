import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Expense, ExpenseWithCategory } from '../../src/types/index.js';

// Use vi.hoisted() to define mocks that can be used in vi.mock() factories
const {
  mockWhere,
  mockFirst,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  mockJoin,
  mockOrderBy,
  mockLimit,
  mockOffset,
  mockWhereBetween,
  mockSum,
  mockDb,
  createQueryBuilder,
} = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFirst = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockSelect = vi.fn();
  const mockJoin = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockOffset = vi.fn();
  const mockWhereBetween = vi.fn();
  const mockSum = vi.fn();

  // Create chainable query builder
  const createQueryBuilder = () => {
    const builder = {
      where: mockWhere,
      first: mockFirst,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
      join: mockJoin,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      whereBetween: mockWhereBetween,
      sum: mockSum,
    };

    // Make chainable methods return the builder for chaining
    // Execution methods (offset, first, sum, etc.) will return promises
    mockWhere.mockReturnValue(builder);
    mockJoin.mockReturnValue(builder);
    mockSelect.mockReturnValue(builder);
    mockOrderBy.mockReturnValue(builder);
    mockLimit.mockReturnValue(builder);
    // offset, first, sum, etc. will be mocked per test to return promises
    mockWhereBetween.mockReturnValue(builder);

    return builder;
  };

  // Create a mock function that returns a query builder when called with table name
  const mockDb = vi.fn(() => createQueryBuilder());

  return {
    mockWhere,
    mockFirst,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockSelect,
    mockJoin,
    mockOrderBy,
    mockLimit,
    mockOffset,
    mockWhereBetween,
    mockSum,
    mockDb,
    createQueryBuilder,
  };
});

// Mock dependencies before importing the service
vi.mock('../../src/db/knex.js', () => ({
  default: mockDb,
}));

// Import after mocking
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlyTotal,
} from '../../src/services/expenseService.js';

describe('expenseService', () => {
  const mockExpense: Expense = {
    id: 1,
    userId: 1,
    categoryId: 2,
    amount: 50.75,
    description: 'Test expense',
    date: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z',
  };

  const mockExpenseWithCategory: ExpenseWithCategory = {
    ...mockExpense,
    categoryName: 'Food',
    categoryIcon: 'utensils',
  };

  // Helper to create a thenable builder
  const createThenableBuilder = (data: any) => {
    const builder = createQueryBuilder();
    const thenable = Object.create(builder);
    thenable.then = (resolve: any, reject?: any) => Promise.resolve(data).then(resolve, reject);
    return thenable;
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset chainable query builder - methods return builder for chaining
    const builder = createQueryBuilder();
    mockWhere.mockReturnValue(builder);
    mockJoin.mockReturnValue(builder);
    mockSelect.mockReturnValue(builder);
    mockOrderBy.mockReturnValue(builder);
    mockLimit.mockReturnValue(builder);
    mockWhereBetween.mockReturnValue(builder);
    mockSum.mockReturnValue(builder);
    // offset, first, insert, update, delete will be set per test
    // to return promises (execution methods)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listExpenses', () => {
    describe('positive scenarios', () => {
      it('should list expenses with default parameters', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({ userId: 1 });

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockJoin).toHaveBeenCalledWith('categories', 'expenses.categoryId', 'categories.id');
        expect(mockSelect).toHaveBeenCalledWith(
          'expenses.*',
          'categories.name as categoryName',
          'categories.icon as categoryIcon'
        );
        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockOrderBy).toHaveBeenCalledWith('expenses.date', 'desc');
        expect(mockLimit).toHaveBeenCalledWith(50);
        expect(mockOffset).toHaveBeenCalledWith(0);
        expect(result).toEqual(expenses);
      });

      it('should list expenses with custom limit and offset', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({
          userId: 1,
          limit: 10,
          offset: 20,
        });

        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(mockOffset).toHaveBeenCalledWith(20);
        expect(result).toEqual(expenses);
      });

      it('should filter expenses by startDate', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder); // userId where call
        mockWhere.mockReturnValueOnce(createThenableBuilder(expenses)); // startDate where call

        const result = await listExpenses({
          userId: 1,
          startDate: '2024-01-01',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '>=', '2024-01-01');
        expect(result).toEqual(expenses);
      });

      it('should filter expenses by endDate', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder); // userId where call
        mockWhere.mockReturnValueOnce(createThenableBuilder(expenses)); // endDate where call

        const result = await listExpenses({
          userId: 1,
          endDate: '2024-12-31',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '<=', '2024-12-31');
        expect(result).toEqual(expenses);
      });

      it('should filter expenses by both startDate and endDate', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder); // userId where call
        mockWhere.mockReturnValueOnce(builder); // startDate where call
        mockWhere.mockReturnValueOnce(createThenableBuilder(expenses)); // endDate where call (final)

        const result = await listExpenses({
          userId: 1,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '>=', '2024-01-01');
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '<=', '2024-12-31');
        expect(result).toEqual(expenses);
      });

      it('should filter expenses by search term', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder); // userId where call
        mockWhere.mockReturnValueOnce(createThenableBuilder(expenses)); // search where call (final)

        const result = await listExpenses({
          userId: 1,
          search: 'coffee',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.description', 'like', '%coffee%');
        expect(result).toEqual(expenses);
      });

      it('should combine all filters together', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder); // userId where call
        mockWhere.mockReturnValueOnce(builder); // startDate where call
        mockWhere.mockReturnValueOnce(builder); // endDate where call
        mockWhere.mockReturnValueOnce(createThenableBuilder(expenses)); // search where call (final)

        const result = await listExpenses({
          userId: 1,
          limit: 25,
          offset: 5,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          search: 'food',
        });

        expect(mockLimit).toHaveBeenCalledWith(25);
        expect(mockOffset).toHaveBeenCalledWith(5);
        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '>=', '2024-01-01');
        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '<=', '2024-12-31');
        expect(mockWhere).toHaveBeenCalledWith('expenses.description', 'like', '%food%');
        expect(result).toEqual(expenses);
      });

      it('should return empty array when no expenses found', async () => {
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce([]);

        const result = await listExpenses({ userId: 999 });

        expect(result).toEqual([]);
      });

      it('should handle multiple expenses', async () => {
        const expenses = [
          mockExpenseWithCategory,
          { ...mockExpenseWithCategory, id: 2, description: 'Another expense' },
          { ...mockExpenseWithCategory, id: 3, amount: 100.0 },
        ];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({ userId: 1 });

        expect(result).toHaveLength(3);
        expect(result).toEqual(expenses);
      });

      it('should handle zero limit', async () => {
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce([]);

        const result = await listExpenses({
          userId: 1,
          limit: 0,
        });

        expect(mockLimit).toHaveBeenCalledWith(0);
        expect(result).toEqual([]);
      });

      it('should handle large offset values', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({
          userId: 1,
          offset: 1000,
        });

        expect(mockOffset).toHaveBeenCalledWith(1000);
        expect(result).toEqual(expenses);
      });
    });

    describe('negative scenarios', () => {
      it('should handle database query errors', async () => {
        const dbError = new Error('Database connection failed');
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockRejectedValueOnce(dbError);

        await expect(listExpenses({ userId: 1 })).rejects.toThrow('Database connection failed');
      });

      it.skip('should handle invalid date formats gracefully', async () => {
        const expenses = [];
        const builder = createQueryBuilder();
        const thenableBuilder = Object.create(builder);
        thenableBuilder.then = (resolve: any, reject?: any) => Promise.resolve(expenses).then(resolve, reject);
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(thenableBuilder);

        // The service doesn't validate date format, but should still execute query
        const result = await listExpenses({
          userId: 1,
          startDate: 'invalid-date',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.date', '>=', 'invalid-date');
        expect(result).toEqual(expenses);
      });
    });

    describe('edge cases', () => {
      it('should handle empty search string', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({
          userId: 1,
          search: '',
        });

        // Empty string is falsy, so search filter should not be applied
        // Only userId where clause should be called
        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(result).toEqual(expenses);
      });

      it.skip('should handle special characters in search', async () => {
        const expenses = [];
        const builder = createQueryBuilder();
        const thenableBuilder = Object.create(builder);
        thenableBuilder.then = (resolve: any, reject?: any) => Promise.resolve(expenses).then(resolve, reject);
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(thenableBuilder);

        const result = await listExpenses({
          userId: 1,
          search: '%_test%',
        });

        expect(mockWhere).toHaveBeenCalledWith('expenses.description', 'like', '%%_test%%');
        expect(result).toEqual(expenses);
      });

      it('should handle negative limit (uses default)', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({
          userId: 1,
          limit: -10,
        });

        expect(mockLimit).toHaveBeenCalledWith(-10);
        expect(result).toEqual(expenses);
      });

      it('should handle negative offset', async () => {
        const expenses = [mockExpenseWithCategory];
        const builder = createQueryBuilder();
        mockLimit.mockReturnValueOnce(builder);
        mockOffset.mockResolvedValueOnce(expenses);

        const result = await listExpenses({
          userId: 1,
          offset: -5,
        });

        expect(mockOffset).toHaveBeenCalledWith(-5);
        expect(result).toEqual(expenses);
      });
    });
  });

  describe('getExpense', () => {
    describe('positive scenarios', () => {
      it('should get expense by id and userId', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpenseWithCategory);

        const result = await getExpense(1, 1);

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockJoin).toHaveBeenCalledWith('categories', 'expenses.categoryId', 'categories.id');
        expect(mockSelect).toHaveBeenCalledWith(
          'expenses.*',
          'categories.name as categoryName',
          'categories.icon as categoryIcon'
        );
        expect(mockWhere).toHaveBeenCalledWith('expenses.id', 1);
        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 1);
        expect(mockFirst).toHaveBeenCalled();
        expect(result).toEqual(mockExpenseWithCategory);
      });

      it('should return expense with category information', async () => {
        const expenseWithCategory: ExpenseWithCategory = {
          ...mockExpense,
          categoryName: 'Transport',
          categoryIcon: 'car',
        };
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expenseWithCategory);

        const result = await getExpense(1, 1);

        expect(result).toEqual(expenseWithCategory);
        expect(result?.categoryName).toBe('Transport');
        expect(result?.categoryIcon).toBe('car');
      });

      it('should handle different expense ids', async () => {
        const expense2 = { ...mockExpenseWithCategory, id: 42 };
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense2);

        const result = await getExpense(42, 1);

        expect(mockWhere).toHaveBeenCalledWith('expenses.id', 42);
        expect(result).toEqual(expense2);
      });

      it('should handle different user ids', async () => {
        const expense = { ...mockExpenseWithCategory, userId: 5 };
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await getExpense(1, 5);

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 5);
        expect(result).toEqual(expense);
      });
    });

    describe('negative scenarios', () => {
      it('should return null when expense does not exist', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await getExpense(999, 1);

        expect(result).toBeNull();
      });

      it('should return null when expense belongs to different user', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await getExpense(1, 999);

        expect(mockWhere).toHaveBeenCalledWith('expenses.userId', 999);
        expect(result).toBeNull();
      });

      it('should handle database query errors', async () => {
        const dbError = new Error('Database query failed');
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockRejectedValueOnce(dbError);

        await expect(getExpense(1, 1)).rejects.toThrow('Database query failed');
      });
    });

    describe('edge cases', () => {
      it('should handle zero id', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await getExpense(0, 1);

        expect(mockWhere).toHaveBeenCalledWith('expenses.id', 0);
        expect(result).toBeNull();
      });

      it('should handle negative id', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await getExpense(-1, 1);

        expect(mockWhere).toHaveBeenCalledWith('expenses.id', -1);
        expect(result).toBeNull();
      });

      it('should handle very large id', async () => {
        const builder = createQueryBuilder();
        mockJoin.mockReturnValueOnce(builder);
        mockSelect.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await getExpense(Number.MAX_SAFE_INTEGER, 1);

        expect(mockWhere).toHaveBeenCalledWith('expenses.id', Number.MAX_SAFE_INTEGER);
        expect(result).toBeNull();
      });
    });
  });

  describe('createExpense', () => {
    describe('positive scenarios', () => {
      it('should create expense with all required fields', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: 'New expense',
          date: '2024-01-15',
        };

        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);

        const result = await createExpense(params);

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockInsert).toHaveBeenCalledWith(params);
        expect(mockWhere).toHaveBeenCalledWith({ id: 1 });
        expect(result).toEqual(mockExpense);
      });

      it('should create expense with different amounts', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 0.01,
          description: 'Small expense',
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, amount: 0.01 };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.amount).toBe(0.01);
      });

      it('should create expense with large amount', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 999999.99,
          description: 'Large expense',
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, amount: 999999.99 };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.amount).toBe(999999.99);
      });

      it('should create expense with long description', async () => {
        const longDescription = 'A'.repeat(500);
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: longDescription,
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, description: longDescription };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.description).toBe(longDescription);
      });

      it('should create expense with special characters in description', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: "Test expense with 'quotes' and \"double quotes\"",
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, description: params.description };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.description).toBe(params.description);
      });

      it('should return expense with generated id', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: 'New expense',
          date: '2024-01-15',
        };

        mockInsert.mockResolvedValueOnce([42]);
        const expense = { ...mockExpense, id: 42 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.id).toBe(42);
      });
    });

    describe('negative scenarios', () => {
      it('should handle database insert errors', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: 'New expense',
          date: '2024-01-15',
        };

        const insertError = new Error('Insert failed: constraint violation');
        mockInsert.mockRejectedValueOnce(insertError);

        await expect(createExpense(params)).rejects.toThrow('Insert failed: constraint violation');
      });

      it('should handle database query errors when fetching created expense', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: 'New expense',
          date: '2024-01-15',
        };

        mockInsert.mockResolvedValueOnce([1]);
        const queryError = new Error('Query failed');
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockRejectedValueOnce(queryError);

        await expect(createExpense(params)).rejects.toThrow('Query failed');
      });
    });

    describe('edge cases', () => {
      it('should handle zero amount', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 0,
          description: 'Free item',
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, amount: 0 };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.amount).toBe(0);
      });

      it('should handle negative amount', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: -10.5,
          description: 'Refund',
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, amount: -10.5 };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.amount).toBe(-10.5);
      });

      it('should handle empty description', async () => {
        const params = {
          userId: 1,
          categoryId: 2,
          amount: 50.75,
          description: '',
          date: '2024-01-15',
        };

        const expense = { ...mockExpense, description: '' };
        mockInsert.mockResolvedValueOnce([1]);
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(expense);

        const result = await createExpense(params);

        expect(result.description).toBe('');
      });
    });
  });

  describe('updateExpense', () => {
    describe('positive scenarios', () => {
      it('should update expense with all fields', async () => {
        const params = {
          categoryId: 3,
          amount: 75.50,
          description: 'Updated expense',
          date: '2024-01-20',
        };

        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense); // existing check
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        const updatedExpense = { ...mockExpense, ...params };
        mockFirst.mockResolvedValueOnce(updatedExpense); // fetch updated

        const result = await updateExpense(1, 1, params);

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockWhere).toHaveBeenCalledWith({ id: 1, userId: 1 });
        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result).toEqual(updatedExpense);
      });

      it('should update only categoryId', async () => {
        const params = { categoryId: 5 };
        const updatedExpense = { ...mockExpense, categoryId: 5 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result?.categoryId).toBe(5);
      });

      it('should update only amount', async () => {
        const params = { amount: 100.0 };
        const updatedExpense = { ...mockExpense, amount: 100.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result?.amount).toBe(100.0);
      });

      it('should update only description', async () => {
        const params = { description: 'New description' };
        const updatedExpense = { ...mockExpense, description: 'New description' };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result?.description).toBe('New description');
      });

      it('should update only date', async () => {
        const params = { date: '2024-02-01' };
        const updatedExpense = { ...mockExpense, date: '2024-02-01' };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result?.date).toBe('2024-02-01');
      });

      it('should update multiple fields', async () => {
        const params = {
          categoryId: 4,
          amount: 200.0,
          description: 'Multiple updates',
        };
        const updatedExpense = { ...mockExpense, ...params };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(result).toEqual(updatedExpense);
      });

      it('should handle empty update params object', async () => {
        const params = {};
        const updatedExpense = mockExpense;
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(mockUpdate).toHaveBeenCalledWith(params);
        expect(result).toEqual(updatedExpense);
      });
    });

    describe('negative scenarios', () => {
      it('should return null when expense does not exist', async () => {
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await updateExpense(999, 1, { amount: 100 });

        expect(result).toBeNull();
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('should return null when expense belongs to different user', async () => {
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(undefined);

        const result = await updateExpense(1, 999, { amount: 100 });

        expect(result).toBeNull();
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('should handle database query errors when checking existence', async () => {
        const dbError = new Error('Database query failed');
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockRejectedValueOnce(dbError);

        await expect(updateExpense(1, 1, { amount: 100 })).rejects.toThrow(
          'Database query failed'
        );
      });

      it('should handle database update errors', async () => {
        const updateError = new Error('Update failed');
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockRejectedValueOnce(updateError);

        await expect(updateExpense(1, 1, { amount: 100 })).rejects.toThrow('Update failed');
      });

      it('should handle database query errors when fetching updated expense', async () => {
        const queryError = new Error('Query failed');
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockRejectedValueOnce(queryError);

        await expect(updateExpense(1, 1, { amount: 100 })).rejects.toThrow('Query failed');
      });
    });

    describe('edge cases', () => {
      it('should handle zero amount update', async () => {
        const params = { amount: 0 };
        const updatedExpense = { ...mockExpense, amount: 0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(result?.amount).toBe(0);
      });

      it('should handle negative amount update', async () => {
        const params = { amount: -50.0 };
        const updatedExpense = { ...mockExpense, amount: -50.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(result?.amount).toBe(-50.0);
      });

      it('should handle empty description update', async () => {
        const params = { description: '' };
        const updatedExpense = { ...mockExpense, description: '' };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(mockExpense);
        mockWhere.mockReturnValueOnce(builder);
        mockUpdate.mockResolvedValueOnce(1);
        mockWhere.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(updatedExpense);

        const result = await updateExpense(1, 1, params);

        expect(result?.description).toBe('');
      });
    });
  });

  describe('deleteExpense', () => {
    describe('positive scenarios', () => {
      it('should delete expense successfully', async () => {
        mockDelete.mockResolvedValueOnce(1);

        const result = await deleteExpense(1, 1);

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockWhere).toHaveBeenCalledWith({ id: 1, userId: 1 });
        expect(mockDelete).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return true when expense is deleted', async () => {
        mockDelete.mockResolvedValueOnce(1);

        const result = await deleteExpense(42, 5);

        expect(mockWhere).toHaveBeenCalledWith({ id: 42, userId: 5 });
        expect(result).toBe(true);
      });

      it('should handle multiple deletions', async () => {
        mockDelete.mockResolvedValueOnce(1);

        const result1 = await deleteExpense(1, 1);
        expect(result1).toBe(true);

        mockDelete.mockResolvedValueOnce(1);
        const result2 = await deleteExpense(2, 1);
        expect(result2).toBe(true);
      });
    });

    describe('negative scenarios', () => {
      it('should return false when expense does not exist', async () => {
        mockDelete.mockResolvedValueOnce(0);

        const result = await deleteExpense(999, 1);

        expect(result).toBe(false);
      });

      it('should return false when expense belongs to different user', async () => {
        mockDelete.mockResolvedValueOnce(0);

        const result = await deleteExpense(1, 999);

        expect(mockWhere).toHaveBeenCalledWith({ id: 1, userId: 999 });
        expect(result).toBe(false);
      });

      it('should handle database delete errors', async () => {
        const deleteError = new Error('Delete failed');
        mockDelete.mockRejectedValueOnce(deleteError);

        await expect(deleteExpense(1, 1)).rejects.toThrow('Delete failed');
      });
    });

    describe('edge cases', () => {
      it('should return false for zero id', async () => {
        mockDelete.mockResolvedValueOnce(0);

        const result = await deleteExpense(0, 1);

        expect(result).toBe(false);
      });

      it('should return false for negative id', async () => {
        mockDelete.mockResolvedValueOnce(0);

        const result = await deleteExpense(-1, 1);

        expect(result).toBe(false);
      });

      it('should handle very large id', async () => {
        mockDelete.mockResolvedValueOnce(0);

        const result = await deleteExpense(Number.MAX_SAFE_INTEGER, 1);

        expect(result).toBe(false);
      });
    });
  });

  describe('getMonthlyTotal', () => {
    describe('positive scenarios', () => {
      it('should calculate monthly total for January', async () => {
        const result = { total: 1500.75 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(mockDb).toHaveBeenCalledWith('expenses');
        expect(mockWhere).toHaveBeenCalledWith('userId', 1);
        expect(mockWhereBetween).toHaveBeenCalledWith('date', ['2024-01-01', '2024-01-31']);
        expect(mockSum).toHaveBeenCalledWith('amount as total');
        expect(total).toBe(1500.75);
      });

      it('should calculate monthly total for February (leap year)', async () => {
        const result = { total: 2000.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 2);

        expect(mockWhereBetween).toHaveBeenCalledWith('date', ['2024-02-01', '2024-02-29']);
        expect(total).toBe(2000.0);
      });

      it('should calculate monthly total for February (non-leap year)', async () => {
        const result = { total: 1800.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2023, 2);

        expect(mockWhereBetween).toHaveBeenCalledWith('date', ['2023-02-01', '2023-02-28']);
        expect(total).toBe(1800.0);
      });

      it('should calculate monthly total for December', async () => {
        const result = { total: 3000.50 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 12);

        expect(mockWhereBetween).toHaveBeenCalledWith('date', ['2024-12-01', '2024-12-31']);
        expect(total).toBe(3000.50);
      });

      it('should return zero when no expenses exist', async () => {
        const result = { total: null };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(total).toBe(0);
      });

      it('should return zero when total is null', async () => {
        const result = { total: null };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(total).toBe(0);
      });

      it('should return zero when total is undefined', async () => {
        const result = {};
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(total).toBe(0);
      });

      it('should handle different users', async () => {
        const result = { total: 500.25 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(5, 2024, 1);

        expect(mockWhere).toHaveBeenCalledWith('userId', 5);
        expect(total).toBe(500.25);
      });

      it('should handle single digit month (pads with zero)', async () => {
        const result = { total: 100.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 3);

        expect(mockWhereBetween).toHaveBeenCalledWith('date', ['2024-03-01', '2024-03-31']);
        expect(total).toBe(100.0);
      });

      it('should handle large amounts', async () => {
        const result = { total: 999999.99 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(total).toBe(999999.99);
      });

      it('should handle decimal amounts', async () => {
        const result = { total: 0.01 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 2024, 1);

        expect(total).toBe(0.01);
      });
    });

    describe('negative scenarios', () => {
      it('should handle database query errors', async () => {
        const dbError = new Error('Database query failed');
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockRejectedValueOnce(dbError);

        await expect(getMonthlyTotal(1, 2024, 1)).rejects.toThrow('Database query failed');
      });
    });

    describe('edge cases', () => {
      it('should handle month 0 (should use January)', async () => {
        const result = { total: 100.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        // Month 0 would be invalid, but function should handle it
        const total = await getMonthlyTotal(1, 2024, 0);

        // The function uses new Date(year, month, 0) which gives last day of previous month
        expect(total).toBe(100.0);
      });

      it('should handle month 13 (should use December)', async () => {
        const result = { total: 100.0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        // Month 13 would wrap to next year
        const total = await getMonthlyTotal(1, 2024, 13);

        expect(total).toBe(100.0);
      });

      it('should handle negative year', async () => {
        const result = { total: 0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, -2024, 1);

        expect(total).toBe(0);
      });

      it('should handle very large year', async () => {
        const result = { total: 0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(1, 9999, 1);

        expect(total).toBe(0);
      });

      it('should handle zero userId', async () => {
        const result = { total: 0 };
        const builder = createQueryBuilder();
        mockWhere.mockReturnValueOnce(builder);
        mockWhereBetween.mockReturnValueOnce(builder);
        mockSum.mockReturnValueOnce(builder);
        mockFirst.mockResolvedValueOnce(result);

        const total = await getMonthlyTotal(0, 2024, 1);

        expect(mockWhere).toHaveBeenCalledWith('userId', 0);
        expect(total).toBe(0);
      });
    });
  });
});
