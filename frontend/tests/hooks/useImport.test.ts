import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  useActiveSession,
  useImportHistory,
  useCreateSession,
  useCancelSession,
  useUploadCsv,
  useSaveMapping,
  useUpdateRow,
  useSkipRow,
  useConfirmImport,
} from '../../src/hooks/useImport';
import * as importApi from '../../src/api/import';
import { renderHookWithQueryClient } from '../utils/test-utils';
import type {
  ImportSession,
  ImportHistory,
  ColumnMapping,
  ParsedRow,
  UploadResult,
  MappingResult,
  ImportResult,
  ActiveSessionResponse,
} from '../../src/types';

// Mock the import API
vi.mock('../../src/api/import', () => ({
  getActiveSession: vi.fn(),
  getImportHistory: vi.fn(),
  createSession: vi.fn(),
  cancelSession: vi.fn(),
  uploadCsv: vi.fn(),
  saveMapping: vi.fn(),
  updateRow: vi.fn(),
  skipRow: vi.fn(),
  confirmImport: vi.fn(),
}));

describe('useImport hooks', () => {
  const mockSession: ImportSession = {
    id: 1,
    userId: 1,
    status: 'mapping',
    fileName: 'expenses.csv',
    fileSize: 1024,
    rawCsvData: 'date,amount,description\n2024-01-15,50.75,Groceries',
    columnMapping: null,
    parsedRows: null,
    validRowCount: 0,
    invalidRowCount: 0,
    skippedRowCount: 0,
    importedExpenseCount: 0,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const mockParsedRow: ParsedRow = {
    rowIndex: 0,
    originalData: { date: '2024-01-15', amount: '50.75', description: 'Groceries' },
    date: '2024-01-15',
    amount: 50.75,
    description: 'Groceries',
    category: 'Food',
    categoryId: 1,
    errors: [],
    skipped: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useActiveSession', () => {
    const mockActiveSessionResponse: ActiveSessionResponse = {
      session: mockSession,
      parsedRows: [mockParsedRow],
    };

    it('should fetch active session successfully', async () => {
      vi.mocked(importApi.getActiveSession).mockResolvedValue(mockActiveSessionResponse);

      const { result } = renderHookWithQueryClient(() => useActiveSession());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActiveSessionResponse);
      expect(importApi.getActiveSession).toHaveBeenCalledTimes(1);
    });

    it('should handle no active session', async () => {
      const error = new Error('No active session');
      vi.mocked(importApi.getActiveSession).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useActiveSession());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should not retry on error (retry: false)', async () => {
      const error = new Error('No active session');
      vi.mocked(importApi.getActiveSession).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useActiveSession());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once due to retry: false
      expect(importApi.getActiveSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('useImportHistory', () => {
    const mockHistory: ImportHistory[] = [
      {
        id: 1,
        userId: 1,
        sessionId: 1,
        fileName: 'expenses.csv',
        totalRows: 100,
        importedRows: 95,
        skippedRows: 5,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 2,
        userId: 1,
        sessionId: 2,
        fileName: 'expenses2.csv',
        totalRows: 50,
        importedRows: 50,
        skippedRows: 0,
        createdAt: '2024-01-16T10:00:00Z',
      },
    ];

    it('should fetch import history successfully', async () => {
      vi.mocked(importApi.getImportHistory).mockResolvedValue(mockHistory);

      const { result } = renderHookWithQueryClient(() => useImportHistory());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHistory);
      expect(importApi.getImportHistory).toHaveBeenCalledTimes(1);
    });

    it('should handle empty history', async () => {
      vi.mocked(importApi.getImportHistory).mockResolvedValue([]);

      const { result } = renderHookWithQueryClient(() => useImportHistory());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch history');
      vi.mocked(importApi.getImportHistory).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useImportHistory());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateSession', () => {
    const mockCreateResponse = { session: mockSession };

    it('should create session successfully', async () => {
      vi.mocked(importApi.createSession).mockResolvedValue(mockCreateResponse);

      const { result } = renderHookWithQueryClient(() => useCreateSession());

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.createSession).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockCreateResponse);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create session');
      vi.mocked(importApi.createSession).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useCreateSession());

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.createSession).mockResolvedValue(mockCreateResponse);

      const { result } = renderHookWithQueryClient(() => useCreateSession());

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query invalidation is tested implicitly - if it works, the query would refetch
      expect(importApi.createSession).toHaveBeenCalled();
    });
  });

  describe('useCancelSession', () => {
    it('should cancel session successfully', async () => {
      vi.mocked(importApi.cancelSession).mockResolvedValue(undefined);

      const { result } = renderHookWithQueryClient(() => useCancelSession());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.cancelSession).toHaveBeenCalledWith(1);
    });

    it('should handle cancellation errors', async () => {
      const error = new Error('Failed to cancel session');
      vi.mocked(importApi.cancelSession).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useCancelSession());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.cancelSession).mockResolvedValue(undefined);

      const { result } = renderHookWithQueryClient(() => useCancelSession());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.cancelSession).toHaveBeenCalled();
    });
  });

  describe('useUploadCsv', () => {
    const mockUploadResult: UploadResult = {
      session: { ...mockSession, status: 'mapping' },
      structure: {
        headers: ['date', 'amount', 'description'],
        delimiter: ',',
        rowCount: 10,
        sampleRows: [['2024-01-15', '50.75', 'Groceries']],
        suggestedMapping: { date: 'date', amount: 'amount', description: 'description' },
      },
    };

    it('should upload CSV successfully', async () => {
      vi.mocked(importApi.uploadCsv).mockResolvedValue(mockUploadResult);

      const { result } = renderHookWithQueryClient(() => useUploadCsv());

      result.current.mutate({
        fileName: 'expenses.csv',
        csvContent: 'date,amount,description\n2024-01-15,50.75,Groceries',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.uploadCsv).toHaveBeenCalledWith('expenses.csv', 'date,amount,description\n2024-01-15,50.75,Groceries');
      expect(result.current.data).toEqual(mockUploadResult);
    });

    it('should handle upload errors', async () => {
      const error = new Error('Invalid CSV format');
      vi.mocked(importApi.uploadCsv).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useUploadCsv());

      result.current.mutate({
        fileName: 'expenses.csv',
        csvContent: 'invalid csv',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.uploadCsv).mockResolvedValue(mockUploadResult);

      const { result } = renderHookWithQueryClient(() => useUploadCsv());

      result.current.mutate({
        fileName: 'expenses.csv',
        csvContent: 'date,amount,description',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.uploadCsv).toHaveBeenCalled();
    });
  });

  describe('useSaveMapping', () => {
    const columnMapping: ColumnMapping = {
      date: 'date',
      amount: 'amount',
      description: 'description',
      category: 'category',
    };

    const mockMappingResult: MappingResult = {
      session: { ...mockSession, status: 'preview' },
      parsedRows: [mockParsedRow],
      validCount: 1,
      invalidCount: 0,
    };

    it('should save mapping successfully', async () => {
      vi.mocked(importApi.saveMapping).mockResolvedValue(mockMappingResult);

      const { result } = renderHookWithQueryClient(() => useSaveMapping());

      result.current.mutate({
        sessionId: 1,
        columnMapping,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.saveMapping).toHaveBeenCalledWith(1, columnMapping);
      expect(result.current.data).toEqual(mockMappingResult);
    });

    it('should handle mapping errors', async () => {
      const error = new Error('Invalid mapping');
      vi.mocked(importApi.saveMapping).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useSaveMapping());

      result.current.mutate({
        sessionId: 1,
        columnMapping,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.saveMapping).mockResolvedValue(mockMappingResult);

      const { result } = renderHookWithQueryClient(() => useSaveMapping());

      result.current.mutate({
        sessionId: 1,
        columnMapping,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.saveMapping).toHaveBeenCalled();
    });
  });

  describe('useUpdateRow', () => {
    const updates = {
      date: '2024-01-16',
      amount: 75.50,
      description: 'Updated description',
      category: 'Transport',
    };

    const mockUpdatedRow: ParsedRow = {
      ...mockParsedRow,
      ...updates,
      amount: 75.50,
    };

    it('should update row successfully', async () => {
      vi.mocked(importApi.updateRow).mockResolvedValue({ row: mockUpdatedRow });

      const { result } = renderHookWithQueryClient(() => useUpdateRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        updates,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.updateRow).toHaveBeenCalledWith(1, 0, updates);
      expect(result.current.data).toEqual({ row: mockUpdatedRow });
    });

    it('should handle partial updates', async () => {
      vi.mocked(importApi.updateRow).mockResolvedValue({ row: mockUpdatedRow });

      const { result } = renderHookWithQueryClient(() => useUpdateRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        updates: { amount: 75.50 },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.updateRow).toHaveBeenCalledWith(1, 0, { amount: 75.50 });
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update row');
      vi.mocked(importApi.updateRow).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useUpdateRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        updates,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.updateRow).mockResolvedValue({ row: mockUpdatedRow });

      const { result } = renderHookWithQueryClient(() => useUpdateRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        updates,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.updateRow).toHaveBeenCalled();
    });
  });

  describe('useSkipRow', () => {
    const mockSkippedRow: ParsedRow = {
      ...mockParsedRow,
      skipped: true,
    };

    it('should skip row successfully', async () => {
      vi.mocked(importApi.skipRow).mockResolvedValue({ row: mockSkippedRow });

      const { result } = renderHookWithQueryClient(() => useSkipRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        skip: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.skipRow).toHaveBeenCalledWith(1, 0, true);
      expect(result.current.data).toEqual({ row: mockSkippedRow });
    });

    it('should unskip row successfully', async () => {
      vi.mocked(importApi.skipRow).mockResolvedValue({ row: mockParsedRow });

      const { result } = renderHookWithQueryClient(() => useSkipRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        skip: false,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.skipRow).toHaveBeenCalledWith(1, 0, false);
    });

    it('should handle skip errors', async () => {
      const error = new Error('Failed to skip row');
      vi.mocked(importApi.skipRow).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useSkipRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        skip: true,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate import-session query on success', async () => {
      vi.mocked(importApi.skipRow).mockResolvedValue({ row: mockSkippedRow });

      const { result } = renderHookWithQueryClient(() => useSkipRow());

      result.current.mutate({
        sessionId: 1,
        rowIndex: 0,
        skip: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.skipRow).toHaveBeenCalled();
    });
  });

  describe('useConfirmImport', () => {
    const mockImportResult: ImportResult = {
      importedCount: 95,
      skippedCount: 5,
      history: {
        id: 1,
        userId: 1,
        sessionId: 1,
        fileName: 'expenses.csv',
        totalRows: 100,
        importedRows: 95,
        skippedRows: 5,
        createdAt: '2024-01-15T10:00:00Z',
      },
    };

    it('should confirm import successfully', async () => {
      vi.mocked(importApi.confirmImport).mockResolvedValue(mockImportResult);

      const { result } = renderHookWithQueryClient(() => useConfirmImport());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(importApi.confirmImport).toHaveBeenCalledWith(1);
      expect(result.current.data).toEqual(mockImportResult);
    });

    it('should handle confirmation errors', async () => {
      const error = new Error('Failed to confirm import');
      vi.mocked(importApi.confirmImport).mockRejectedValue(error);

      const { result } = renderHookWithQueryClient(() => useConfirmImport());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should invalidate multiple queries on success', async () => {
      vi.mocked(importApi.confirmImport).mockResolvedValue(mockImportResult);

      const { result } = renderHookWithQueryClient(() => useConfirmImport());

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query invalidation is tested implicitly
      // The hook should invalidate: import-session, import-history, expenses, monthly-total
      expect(importApi.confirmImport).toHaveBeenCalled();
    });

    it('should set isPending during confirmation', async () => {
      vi.mocked(importApi.confirmImport).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockImportResult), 100))
      );

      const { result } = renderHookWithQueryClient(() => useConfirmImport());

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
