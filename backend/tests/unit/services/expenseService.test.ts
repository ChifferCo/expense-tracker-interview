/**
 * @fileoverview Unit tests for expenseService
 * Tests CRUD operations and monthly totals for expenses with mocked database
 *
 * @see src/services/expenseService.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock must be hoisted - use inline factory
vi.mock('../../../src/db/knex.js', () => {
  const createChainMock = (resolveValue?: unknown) => {
    const chain: Record<string, Mock> & { then?: (resolve: (v: unknown) => void) => void } = {};
    chain.join = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.whereBetween = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.offset = vi.fn(() => chain);
    chain.first = vi.fn();
    chain.insert = vi.fn();
    chain.update = vi.fn();
    chain.delete = vi.fn();
    chain.sum = vi.fn(() => chain);
    // Make chain thenable for await support
    chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
    return chain;
  };

  const mockDb = vi.fn(() => createChainMock());
  (mockDb as unknown as Record<string, unknown>).__createChainMock = createChainMock;
  return { default: mockDb };
});

import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlyTotal,
} from '../../../src/services/expenseService.js';
import db from '../../../src/db/knex.js';

// Helper to get mock function with proper typing
type ChainMock = Record<string, Mock> & { then?: (resolve: (v: unknown) => void) => void };
type DbMock = Mock & { __createChainMock: (resolveValue?: unknown) => ChainMock };
const mockDb = db as unknown as DbMock;

describe('expenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listExpenses', () => {
    it('should list expenses for a user with default pagination', async () => {
      // Arrange
      const mockExpenses = [
        { id: 1, userId: 1, amount: 100, description: 'Test 1', categoryName: 'Food' },
        { id: 2, userId: 1, amount: 200, description: 'Test 2', categoryName: 'Transport' },
      ];
      const chain = mockDb.__createChainMock(mockExpenses);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await listExpenses({ userId: 1 });

      // Assert
      expect(result).toEqual(mockExpenses);
      expect(mockDb).toHaveBeenCalledWith('expenses');
      expect(chain.join).toHaveBeenCalledWith('categories', 'expenses.categoryId', 'categories.id');
      expect(chain.where).toHaveBeenCalledWith('expenses.userId', 1);
      expect(chain.limit).toHaveBeenCalledWith(50);
      expect(chain.offset).toHaveBeenCalledWith(0);
    });

    it('should apply custom pagination', async () => {
      // Arrange
      const chain = mockDb.__createChainMock([]);
      mockDb.mockReturnValue(chain);

      // Act
      await listExpenses({ userId: 1, limit: 10, offset: 20 });

      // Assert
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(chain.offset).toHaveBeenCalledWith(20);
    });

    it('should apply date filters when provided', async () => {
      // Arrange
      const chain = mockDb.__createChainMock([]);
      mockDb.mockReturnValue(chain);

      // Act
      await listExpenses({ userId: 1, startDate: '2024-01-01', endDate: '2024-12-31' });

      // Assert
      expect(chain.where).toHaveBeenCalledWith('expenses.date', '>=', '2024-01-01');
      expect(chain.where).toHaveBeenCalledWith('expenses.date', '<=', '2024-12-31');
    });

    it('should apply search filter when provided', async () => {
      // Arrange
      const chain = mockDb.__createChainMock([]);
      mockDb.mockReturnValue(chain);

      // Act
      await listExpenses({ userId: 1, search: 'grocery' });

      // Assert
      expect(chain.where).toHaveBeenCalledWith('expenses.description', 'like', '%grocery%');
    });

    it('should order by date descending', async () => {
      // Arrange
      const chain = mockDb.__createChainMock([]);
      mockDb.mockReturnValue(chain);

      // Act
      await listExpenses({ userId: 1 });

      // Assert
      expect(chain.orderBy).toHaveBeenCalledWith('expenses.date', 'desc');
    });
  });

  describe('getExpense', () => {
    it('should return expense when found', async () => {
      // Arrange
      const mockExpense = {
        id: 1,
        userId: 1,
        amount: 100,
        description: 'Test expense',
        categoryName: 'Food',
      };
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(mockExpense);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getExpense(1, 1);

      // Assert
      expect(result).toEqual(mockExpense);
      expect(chain.where).toHaveBeenCalledWith('expenses.id', 1);
      expect(chain.where).toHaveBeenCalledWith('expenses.userId', 1);
    });

    it('should return null when expense not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getExpense(999, 1);

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce user ownership', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      await getExpense(1, 2);

      // Assert
      expect(chain.where).toHaveBeenCalledWith('expenses.userId', 2);
    });
  });

  describe('createExpense', () => {
    it('should create and return new expense', async () => {
      // Arrange
      const mockExpense = {
        id: 1,
        userId: 1,
        categoryId: 1,
        amount: 100,
        description: 'New expense',
        date: '2024-01-15',
      };
      const chain = mockDb.__createChainMock();
      chain.insert.mockResolvedValue([1]);
      chain.first.mockResolvedValue(mockExpense);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await createExpense({
        userId: 1,
        categoryId: 1,
        amount: 100,
        description: 'New expense',
        date: '2024-01-15',
      });

      // Assert
      expect(result).toEqual(mockExpense);
      expect(chain.insert).toHaveBeenCalledWith({
        userId: 1,
        categoryId: 1,
        amount: 100,
        description: 'New expense',
        date: '2024-01-15',
      });
    });
  });

  describe('updateExpense', () => {
    it('should update existing expense', async () => {
      // Arrange
      const existingExpense = { id: 1, userId: 1, amount: 100 };
      const updatedExpense = { id: 1, userId: 1, amount: 150 };
      let callCount = 0;
      const chain = mockDb.__createChainMock();
      chain.first.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(existingExpense) : Promise.resolve(updatedExpense);
      });
      chain.update.mockResolvedValue(1);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await updateExpense(1, 1, { amount: 150 });

      // Assert
      expect(result).toEqual(updatedExpense);
      expect(chain.update).toHaveBeenCalledWith({ amount: 150 });
    });

    it('should return null if expense not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await updateExpense(999, 1, { amount: 150 });

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce user ownership on update', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      await updateExpense(1, 2, { amount: 150 });

      // Assert
      expect(chain.where).toHaveBeenCalledWith({ id: 1, userId: 2 });
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense and return true', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.delete.mockResolvedValue(1);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await deleteExpense(1, 1);

      // Assert
      expect(result).toBe(true);
      expect(chain.where).toHaveBeenCalledWith({ id: 1, userId: 1 });
    });

    it('should return false if expense not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.delete.mockResolvedValue(0);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await deleteExpense(999, 1);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getMonthlyTotal', () => {
    it('should return total expenses for given month', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ total: 500 });
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getMonthlyTotal(1, 2024, 3);

      // Assert
      expect(result).toBe(500);
      expect(chain.where).toHaveBeenCalledWith('userId', 1);
    });

    it('should return 0 when no expenses found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ total: null });
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getMonthlyTotal(1, 2024, 3);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when result is undefined', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getMonthlyTotal(1, 2024, 3);

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate correct date range for February leap year', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ total: 100 });
      mockDb.mockReturnValue(chain);

      // Act
      await getMonthlyTotal(1, 2024, 2); // February 2024 (leap year)

      // Assert
      expect(chain.whereBetween).toHaveBeenCalledWith('date', [
        '2024-02-01',
        '2024-02-29',
      ]);
    });

    it('should calculate correct date range for regular February', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ total: 100 });
      mockDb.mockReturnValue(chain);

      // Act
      await getMonthlyTotal(1, 2023, 2); // February 2023 (not leap year)

      // Assert
      expect(chain.whereBetween).toHaveBeenCalledWith('date', [
        '2023-02-01',
        '2023-02-28',
      ]);
    });

    it('should calculate correct date range for December', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ total: 100 });
      mockDb.mockReturnValue(chain);

      // Act
      await getMonthlyTotal(1, 2024, 12);

      // Assert
      expect(chain.whereBetween).toHaveBeenCalledWith('date', [
        '2024-12-01',
        '2024-12-31',
      ]);
    });
  });
});
