import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  useExpenses,
  useExpense,
  useMonthlyTotal,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '../../src/hooks/useExpenses';
import * as expensesApi from '../../src/api/expenses';
import { renderHookWithQueryClient } from '../utils/test-utils';
import type { Expense, CreateExpenseData, UpdateExpenseData, MonthlyTotal } from '../../src/types';

// Mock the expenses API
vi.mock('../../src/api/expenses', () => ({
  getExpenses: vi.fn(),
  getExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getMonthlyTotal: vi.fn(),
}));

describe('useExpenses', () => {
  const mockExpenses: Expense[] = [
    {
      id: 1,
      userId: 1,
      categoryId: 1,
      amount: 50.75,
      description: 'Groceries',
      date: '2024-01-15',
      createdAt: '2024-01-15T10:00:00Z',
      categoryName: 'Food',
      categoryIcon: 'utensils',
    },
    {
      id: 2,
      userId: 1,
      categoryId: 2,
      amount: 25.00,
      description: 'Bus ticket',
      date: '2024-01-16',
      createdAt: '2024-01-16T10:00:00Z',
      categoryName: 'Transport',
      categoryIcon: 'car',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useExpenses', () => {
    it('should fetch expenses without params', async () => {
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      const { result } = renderHookWithQueryClient(() => useExpenses());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExpenses);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith(undefined);
    });

    it('should fetch expenses with search param', async () => {
      vi.mocked(expensesApi.getExpenses).mockResolvedValue([mockExpenses[0]]);

      const { result } = renderHookWithQueryClient(() =>
        useExpenses({ search: 'groceries' })
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockExpenses[0]]);
      expect(expensesApi.getExpenses).toHaveBeenCalledWith({ search: 'groceries' });
    });

    it('should fetch expenses with date range', async () => {
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      const { result } = renderHookWithQueryClient(() =>
        useExpenses({ startDate: '2024-01-01', endDate: '2024-01-31' })
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.getExpenses).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should fetch expenses with all params', async () => {
      vi.mocked(expensesApi.getExpenses).mockResolvedValue([mockExpenses[0]]);

      const { result } = renderHookWithQueryClient(() =>
        useExpenses({
          search: 'food',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.getExpenses).toHaveBeenCalledWith({
        search: 'food',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch expenses');
      vi.mocked(expensesApi.getExpenses).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useExpenses());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should use different query keys for different params', async () => {
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      const { result: result1 } = renderHookWithQueryClient(() => useExpenses());
      const { result: result2 } = renderHookWithQueryClient(() =>
        useExpenses({ search: 'test' })
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(expensesApi.getExpenses).toHaveBeenCalledTimes(2);
    });
  });

  describe('useExpense', () => {
    const mockExpense = mockExpenses[0];

    it('should fetch a single expense', async () => {
      vi.mocked(expensesApi.getExpense).mockResolvedValue(mockExpense);

      const { result } = renderHookWithQueryClient(() => useExpense(1));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExpense);
      expect(expensesApi.getExpense).toHaveBeenCalledWith(1);
    });

    it('should not fetch when id is 0', async () => {
      const { result } = renderHookWithQueryClient(() => useExpense(0));

      // Query should be disabled
      expect(result.current.isFetching).toBe(false);
      expect(expensesApi.getExpense).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('Expense not found');
      vi.mocked(expensesApi.getExpense).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useExpense(999));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should use correct query key', async () => {
      vi.mocked(expensesApi.getExpense).mockResolvedValue(mockExpense);

      const { result: result1 } = renderHookWithQueryClient(() => useExpense(1));
      const { result: result2 } = renderHookWithQueryClient(() => useExpense(2));

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(expensesApi.getExpense).toHaveBeenCalledTimes(2);
    });
  });

  describe('useMonthlyTotal', () => {
    const mockMonthlyTotal: MonthlyTotal = {
      total: 1000.50,
      year: 2024,
      month: 1,
    };

    it('should fetch monthly total without params', async () => {
      vi.mocked(expensesApi.getMonthlyTotal).mockResolvedValue(mockMonthlyTotal);

      const { result } = renderHookWithQueryClient(() => useMonthlyTotal());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMonthlyTotal);
      expect(expensesApi.getMonthlyTotal).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should fetch monthly total with year and month', async () => {
      vi.mocked(expensesApi.getMonthlyTotal).mockResolvedValue(mockMonthlyTotal);

      const { result } = renderHookWithQueryClient(() => useMonthlyTotal(2024, 1));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMonthlyTotal);
      expect(expensesApi.getMonthlyTotal).toHaveBeenCalledWith(2024, 1);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch monthly total');
      vi.mocked(expensesApi.getMonthlyTotal).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useMonthlyTotal());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateExpense', () => {
    const newExpenseData: CreateExpenseData = {
      categoryId: 1,
      amount: 75.50,
      description: 'New expense',
      date: '2024-01-20',
    };

    const createdExpense: Expense = {
      id: 3,
      userId: 1,
      categoryId: 1,
      amount: 75.50,
      description: 'New expense',
      date: '2024-01-20',
      createdAt: '2024-01-20T10:00:00Z',
      categoryName: 'Food',
      categoryIcon: 'utensils',
    };

    it('should create expense successfully', async () => {
      vi.mocked(expensesApi.createExpense).mockResolvedValue(createdExpense);

      const { result } = renderHookWithQueryClient(() => useCreateExpense());

      expect(result.current.isPending).toBe(false);

      result.current.mutate(newExpenseData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.createExpense).toHaveBeenCalledWith(newExpenseData);
      expect(result.current.data).toEqual(createdExpense);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create expense');
      vi.mocked(expensesApi.createExpense).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useCreateExpense());

      result.current.mutate(newExpenseData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should set isPending during mutation', async () => {
      vi.mocked(expensesApi.createExpense).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createdExpense), 100))
      );

      const { result } = renderHookWithQueryClient(() => useCreateExpense());

      result.current.mutate(newExpenseData);

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('useUpdateExpense', () => {
    const updateData: UpdateExpenseData = {
      amount: 100.00,
      description: 'Updated expense',
    };

    const updatedExpense: Expense = {
      id: 1,
      userId: 1,
      categoryId: 1,
      amount: 100.00,
      description: 'Updated expense',
      date: '2024-01-15',
      createdAt: '2024-01-15T10:00:00Z',
      categoryName: 'Food',
      categoryIcon: 'utensils',
    };

    it('should update expense successfully', async () => {
      vi.mocked(expensesApi.updateExpense).mockResolvedValue(updatedExpense);

      const { result } = renderHookWithQueryClient(() => useUpdateExpense());

      result.current.mutate({ id: 1, data: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.updateExpense).toHaveBeenCalledWith(1, updateData);
      expect(result.current.data).toEqual(updatedExpense);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update expense');
      vi.mocked(expensesApi.updateExpense).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useUpdateExpense());

      result.current.mutate({ id: 1, data: updateData });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should support partial updates', async () => {
      vi.mocked(expensesApi.updateExpense).mockResolvedValue(updatedExpense);

      const { result } = renderHookWithQueryClient(() => useUpdateExpense());

      result.current.mutate({ id: 1, data: { amount: 100.00 } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.updateExpense).toHaveBeenCalledWith(1, { amount: 100.00 });
    });
  });

  describe('useDeleteExpense', () => {
    it('should delete expense successfully', async () => {
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);

      const { result } = renderHookWithQueryClient(() => useDeleteExpense());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(expensesApi.deleteExpense).toHaveBeenCalledWith(1);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Failed to delete expense');
      vi.mocked(expensesApi.deleteExpense).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useDeleteExpense());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should set isPending during deletion', async () => {
      vi.mocked(expensesApi.deleteExpense).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      const { result } = renderHookWithQueryClient(() => useDeleteExpense());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });
});
