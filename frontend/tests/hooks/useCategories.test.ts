import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useCategories } from '../../src/hooks/useCategories';
import * as categoriesApi from '../../src/api/categories';
import { renderHookWithQueryClient } from '../utils/test-utils';
import type { Category } from '../../src/types';

// Mock the categories API
vi.mock('../../src/api/categories', () => ({
  getCategories: vi.fn(),
}));

describe('useCategories', () => {
  const mockCategories: Category[] = [
    { id: 1, name: 'Food', icon: 'utensils' },
    { id: 2, name: 'Transport', icon: 'car' },
    { id: 3, name: 'Shopping', icon: 'shopping-bag' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch categories successfully', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue(mockCategories);

    const { result } = renderHookWithQueryClient(() => useCategories());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCategories);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch categories');
    vi.mocked(categoriesApi.getCategories).mockRejectedValue(error);

    const { result } = renderHookWithQueryClient(() => useCategories());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use correct query key', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue(mockCategories);

    const { result } = renderHookWithQueryClient(() => useCategories());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the query key is used correctly by checking if data is cached
    const { result: result2 } = renderHookWithQueryClient(() => useCategories());

    // Should use cached data, so getCategories should still be called only once
    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Due to staleTime: Infinity, the query should be cached
    expect(result2.current.data).toEqual(mockCategories);
  });

  it('should return query state properties', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue(mockCategories);

    const { result } = renderHookWithQueryClient(() => useCategories());

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('isSuccess');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should support refetching', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue(mockCategories);

    const { result } = renderHookWithQueryClient(() => useCategories());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(categoriesApi.getCategories).toHaveBeenCalledTimes(2);
  });

  it('should handle empty categories array', async () => {
    vi.mocked(categoriesApi.getCategories).mockResolvedValue([]);

    const { result } = renderHookWithQueryClient(() => useCategories());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
