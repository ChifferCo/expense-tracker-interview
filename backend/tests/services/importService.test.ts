import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ImportSession, ImportHistory, ColumnMapping, ParsedRow } from '../../src/types/index.js';

const {
  mockWhere,
  mockWhereNotIn,
  mockOrderBy,
  mockFirst,
  mockUpdate,
  mockInsert,
  mockSelect,
  mockTransaction,
  mockFnNow,
  mockDb,
  createQueryBuilder,
} = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockWhereNotIn = vi.fn();
  const mockOrderBy = vi.fn();
  const mockFirst = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockTransaction = vi.fn();
  const mockFnNow = vi.fn();

  const createQueryBuilder = () => {
    const builder = {
      where: mockWhere,
      whereNotIn: mockWhereNotIn,
      orderBy: mockOrderBy,
      first: mockFirst,
      update: mockUpdate,
      insert: mockInsert,
      select: mockSelect,
    };
    mockWhere.mockReturnValue(builder);
    mockWhereNotIn.mockReturnValue(builder);
    mockOrderBy.mockReturnValue(builder);
    mockSelect.mockReturnValue(builder);
    return builder;
  };

  const mockDb = vi.fn((table?: string) => createQueryBuilder());

  return {
    mockWhere,
    mockWhereNotIn,
    mockOrderBy,
    mockFirst,
    mockUpdate,
    mockInsert,
    mockSelect,
    mockTransaction,
    mockFnNow,
    mockDb,
    createQueryBuilder,
  };
});

vi.mock('../../src/db/knex.js', () => {
  const dbFn = (table?: string) => mockDb(table);
  (dbFn as unknown as { fn: { now: unknown }; transaction: unknown }).fn = { now: mockFnNow };
  (dbFn as unknown as { fn: { now: unknown }; transaction: unknown }).transaction = mockTransaction;
  return { default: dbFn };
});

vi.mock('../../src/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getActiveSession,
  getSession,
  createSession,
  cancelSession,
  uploadCsv,
  saveMapping,
  updateRow,
  skipRow,
  confirmImport,
  listImportHistory,
  getParsedRows,
} from '../../src/services/importService.js';

describe('importService', () => {
  let builder: ReturnType<typeof createQueryBuilder>;

  const baseSession: ImportSession = {
    id: 1,
    userId: 1,
    status: 'upload',
    fileName: null,
    fileSize: null,
    rawCsvData: null,
    columnMapping: null,
    parsedRows: null,
    validRowCount: 0,
    invalidRowCount: 0,
    skippedRowCount: 0,
    importedExpenseCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const createThenableBuilder = (data: unknown) => {
    const builder = createQueryBuilder();
    const thenable = Object.assign(Object.create(builder), {
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(data).then(resolve, reject),
    });
    return thenable;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    builder = createQueryBuilder();
    mockWhere.mockReturnValue(builder);
    mockWhereNotIn.mockReturnValue(builder);
    mockOrderBy.mockReturnValue(builder);
    mockSelect.mockReturnValue(builder);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getActiveSession', () => {
    it('should return active session when one exists', async () => {
      const session = { ...baseSession, status: 'upload' as const };
      mockFirst.mockResolvedValueOnce(session);

      const result = await getActiveSession(1);

      expect(mockDb).toHaveBeenCalledWith('import_sessions');
      expect(mockWhere).toHaveBeenCalledWith({ userId: 1 });
      expect(mockWhereNotIn).toHaveBeenCalledWith('status', ['completed', 'cancelled']);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result).toEqual(session);
    });

    it('should return null when no active session exists', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const result = await getActiveSession(99);

      expect(result).toBeNull();
    });

    it('should exclude completed and cancelled sessions', async () => {
      mockFirst.mockResolvedValueOnce(null);

      await getActiveSession(1);

      expect(mockWhereNotIn).toHaveBeenCalledWith('status', ['completed', 'cancelled']);
    });

    it('should handle database errors', async () => {
      mockFirst.mockRejectedValueOnce(new Error('DB error'));

      await expect(getActiveSession(1)).rejects.toThrow('DB error');
    });
  });

  describe('getSession', () => {
    it('should return session when found by id and userId', async () => {
      const session = { ...baseSession, id: 5 };
      mockFirst.mockResolvedValueOnce(session);

      const result = await getSession(5, 1);

      expect(mockDb).toHaveBeenCalledWith('import_sessions');
      expect(mockWhere).toHaveBeenCalledWith({ id: 5, userId: 1 });
      expect(result).toEqual(session);
    });

    it('should return null when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const result = await getSession(999, 1);

      expect(result).toBeNull();
    });

    it('should return null when userId does not match', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const result = await getSession(1, 999);

      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create new session and cancel any existing active session', async () => {
      mockUpdate.mockResolvedValueOnce(0);
      mockInsert.mockResolvedValueOnce([42]);
      mockFirst.mockResolvedValueOnce({ ...baseSession, id: 42 });

      const result = await createSession(1);

      expect(mockDb).toHaveBeenCalledWith('import_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
      expect(mockInsert).toHaveBeenCalledWith({ userId: 1, status: 'upload' });
      expect(result.id).toBe(42);
    });

    it('should cancel existing active session before creating new one', async () => {
      mockUpdate.mockResolvedValueOnce(1);
      mockInsert.mockResolvedValueOnce([2]);
      mockFirst.mockResolvedValueOnce({ ...baseSession, id: 2 });

      await createSession(1);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should handle insert failure', async () => {
      mockUpdate.mockResolvedValueOnce(0);
      mockInsert.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(createSession(1)).rejects.toThrow('Insert failed');
    });
  });

  describe('cancelSession', () => {
    it('should cancel session and return true when session exists', async () => {
      mockUpdate.mockResolvedValueOnce(1);

      const result = await cancelSession(1, 1);

      expect(mockDb).toHaveBeenCalledWith('import_sessions');
      expect(mockWhere).toHaveBeenCalledWith({ id: 1, userId: 1 });
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
      expect(result).toBe(true);
    });

    it('should return false when no rows updated', async () => {
      mockUpdate.mockResolvedValueOnce(0);

      const result = await cancelSession(999, 1);

      expect(result).toBe(false);
    });

    it('should not cancel already completed session', async () => {
      mockUpdate.mockResolvedValueOnce(0);

      await cancelSession(1, 1);

      expect(mockWhereNotIn).toHaveBeenCalledWith('status', ['completed', 'cancelled']);
    });
  });

  describe('uploadCsv', () => {
    const minimalCsv = 'Date,Amount,Description\n2024-01-15,25.50,Lunch';

    function setupUploadCsvMocks(updatedSession: ImportSession) {
      mockFirst.mockResolvedValueOnce(null); // getActiveSession -> null
      mockUpdate.mockResolvedValueOnce(0);   // createSession cancel
      mockInsert.mockResolvedValueOnce([1]); // createSession insert
      mockFirst.mockResolvedValueOnce({ ...baseSession, id: 1 }); // createSession get inserted
      mockUpdate.mockResolvedValueOnce(1);   // uploadCsv update session
      mockFirst.mockResolvedValueOnce(updatedSession); // getSession at end
    }

    it('should upload CSV and return session with structure', async () => {
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: minimalCsv };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', minimalCsv);

      expect(result.session).toBeDefined();
      expect(result.structure.headers).toEqual(['Date', 'Amount', 'Description']);
      expect(result.structure.delimiter).toBe(',');
      expect(result.structure.rowCount).toBe(1);
      expect(result.structure.sampleRows).toHaveLength(1);
      expect(result.structure.suggestedMapping).toMatchObject({
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      });
    });

    it('should reuse existing active session when present', async () => {
      const existingSession = { ...baseSession, id: 10, status: 'upload' as const };
      const updatedSession = { ...existingSession, rawCsvData: minimalCsv };
      mockFirst.mockResolvedValueOnce(existingSession); // getActiveSession returns session
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce(updatedSession);

      const result = await uploadCsv(1, 'file.csv', minimalCsv);

      expect(result.session.id).toBe(10);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should detect semicolon delimiter', async () => {
      const csvSemicolon = 'Date;Amount;Description\n2024-01-15;25.50;Lunch';
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: csvSemicolon };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', csvSemicolon);

      expect(result.structure.delimiter).toBe(';');
      expect(result.structure.headers).toEqual(['Date', 'Amount', 'Description']);
    });

    it('should detect tab delimiter', async () => {
      const csvTab = 'Date\tAmount\tDescription\n2024-01-15\t25.50\tLunch';
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: csvTab };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', csvTab);

      expect(result.structure.delimiter).toBe('\t');
      expect(result.structure.headers).toEqual(['Date', 'Amount', 'Description']);
    });

    it('should throw when CSV has only header row', async () => {
      setupUploadCsvMocks({ ...baseSession, id: 1 });

      await expect(
        uploadCsv(1, 'test.csv', 'Date,Amount,Description\n')
      ).rejects.toThrow('CSV must have at least a header row and one data row');
    });

    it('should throw when CSV has no data rows', async () => {
      setupUploadCsvMocks({ ...baseSession, id: 1 });

      await expect(
        uploadCsv(1, 'test.csv', 'Date,Amount,Description')
      ).rejects.toThrow('CSV must have at least a header row and one data row');
    });

    it('should suggest mapping for alternative header names', async () => {
      const csv = 'Transaction Date,Total,Notes,Type\n2024-01-15,100.00,Office supplies,Shopping';
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: csv };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', csv);

      expect(result.structure.suggestedMapping.date).toBe('Transaction Date');
      expect(result.structure.suggestedMapping.amount).toBe('Total');
      expect(result.structure.suggestedMapping.description).toBe('Notes');
      expect(result.structure.suggestedMapping.category).toBe('Type');
    });

    it('should handle CRLF line endings', async () => {
      const csvCRLF = 'Date,Amount,Description\r\n2024-01-15,25.50,Lunch\r\n';
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: csvCRLF };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', csvCRLF);

      expect(result.structure.rowCount).toBe(1);
      expect(result.structure.headers).toEqual(['Date', 'Amount', 'Description']);
    });

    it('should handle quoted fields containing delimiter', async () => {
      const csvQuoted = 'Date,Amount,Description\n2024-01-15,25.50,"Lunch, coffee"';
      const updatedSession = { ...baseSession, id: 1, fileName: 'test.csv', rawCsvData: csvQuoted };
      setupUploadCsvMocks(updatedSession);

      const result = await uploadCsv(1, 'test.csv', csvQuoted);

      expect(result.structure.rowCount).toBe(1);
      expect(result.structure.sampleRows[0]).toContain('Lunch, coffee');
    });
  });

  describe('saveMapping', () => {
    const mapping: ColumnMapping = {
      date: 'Date',
      amount: 'Amount',
      description: 'Description',
      category: 'Category',
    };
    const csvWithData = `Date,Amount,Description,Category
2024-01-15,25.50,Lunch,Food
2024-01-16,10.00,Refund,Other`;

    const categoriesFoodOther = [
      { id: 1, name: 'Food' },
      { id: 2, name: 'Other' },
    ];

    it('should parse rows and return valid/invalid counts', async () => {
      const sessionWithCsv = {
        ...baseSession,
        id: 1,
        status: 'upload',
        rawCsvData: csvWithData,
      };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder(categoriesFoodOther));
      mockSelect.mockReturnValueOnce(createThenableBuilder(categoriesFoodOther));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({
        ...sessionWithCsv,
        status: 'preview',
        validRowCount: 2,
        invalidRowCount: 0,
        parsedRows: '[]',
      });

      const result = await saveMapping(1, 1, mapping);

      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(0);
      expect(result.parsedRows).toHaveLength(2);
    });

    it('should throw when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      await expect(saveMapping(999, 1, mapping)).rejects.toThrow('Session not found');
    });

    it('should throw when session has no CSV data', async () => {
      mockFirst.mockResolvedValueOnce({
        ...baseSession, id: 1, rawCsvData: null,
      });

      await expect(saveMapping(1, 1, mapping)).rejects.toThrow('No CSV data in session');
    });

    it('should mark rows with invalid date as invalid', async () => {
      const badCsv = `Date,Amount,Description,Category
invalid,25.50,Lunch,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: badCsv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.invalidCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.parsedRows[0].errors.some(e => e.field === 'date')).toBe(true);
    });

    it('should mark rows with zero or negative amount as invalid', async () => {
      const badCsv = `Date,Amount,Description,Category
2024-01-15,0,Lunch,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: badCsv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.invalidCount).toBe(1);
      expect(result.parsedRows[0].errors.some(e => e.field === 'amount')).toBe(true);
    });

    it('should mark rows with empty description as invalid', async () => {
      const badCsv = `Date,Amount,Description,Category
2024-01-15,25.50,,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: badCsv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.invalidCount).toBe(1);
      expect(result.parsedRows[0].errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should parse amount with currency symbols', async () => {
      const csv = `Date,Amount,Description,Category
2024-01-15,$25.50,Lunch,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: csv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.validCount).toBe(1);
      expect(result.parsedRows[0].amount).toBe(25.5);
    });

    it('should parse negative amount in parentheses (row invalid due to amount <= 0)', async () => {
      const csv = `Date,Amount,Description,Category
2024-01-15,(10.00),Refund,Other`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: csv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 2, name: 'Other' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.parsedRows[0].amount).toBe(-10);
      expect(result.invalidCount).toBe(1);
      expect(result.validCount).toBe(0);
      expect(result.parsedRows[0].errors.some(e => e.field === 'amount')).toBe(true);
    });

    it('should work without category column in mapping', async () => {
      const mappingNoCat: ColumnMapping = {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      };
      const csv = `Date,Amount,Description
2024-01-15,25.50,Lunch`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: csv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mappingNoCat);

      expect(result.validCount).toBe(1);
      expect(result.parsedRows[0].category).toBeNull();
      expect(result.parsedRows[0].categoryId).toBeNull();
    });

    it('should match category by alias (e.g. groceries -> Food)', async () => {
      const csv = `Date,Amount,Description,Category
2024-01-15,25.50,Lunch,groceries`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: csv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder(categoriesFoodOther));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.parsedRows[0].category).toBe('Food');
      expect(result.parsedRows[0].categoryId).toBe(1);
    });

    it('should parse MM/DD/YYYY date format', async () => {
      const csv = `Date,Amount,Description,Category
01/15/2024,25.50,Lunch,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: csv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.validCount).toBe(1);
      expect(result.parsedRows[0].date).toBe('2024-01-15');
    });

    it('should mark row invalid when amount is non-numeric', async () => {
      const badCsv = `Date,Amount,Description,Category
2024-01-15,abc,Lunch,Food`;
      const sessionWithCsv = { ...baseSession, id: 1, status: 'upload', rawCsvData: badCsv };
      mockFirst.mockResolvedValueOnce(sessionWithCsv);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 1, name: 'Food' }]));
      mockUpdate.mockResolvedValueOnce(1);
      mockFirst.mockResolvedValueOnce({ ...sessionWithCsv, status: 'preview', parsedRows: '[]' });

      const result = await saveMapping(1, 1, mapping);

      expect(result.invalidCount).toBe(1);
      expect(result.parsedRows[0].amount).toBeNull();
      expect(result.parsedRows[0].errors.some(e => e.field === 'amount')).toBe(true);
    });
  });

  describe('updateRow', () => {
    const parsedRows: ParsedRow[] = [
      {
        rowIndex: 0,
        originalData: {},
        date: '2024-01-15',
        amount: 25.5,
        description: 'Lunch',
        category: 'Food',
        categoryId: 1,
        errors: [],
        skipped: false,
      },
    ];
    const sessionWithRows = {
      ...baseSession,
      id: 1,
      status: 'preview' as const,
      parsedRows: JSON.stringify(parsedRows),
    };

    it('should update row date and re-validate', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await updateRow(1, 1, 0, { date: '2024-02-20' });

      expect(result.date).toBe('2024-02-20');
      expect(result.errors).toHaveLength(0);
    });

    it('should update row amount', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await updateRow(1, 1, 0, { amount: 100 });

      expect(result.amount).toBe(100);
    });

    it('should update row description', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await updateRow(1, 1, 0, { description: 'Updated desc' });

      expect(result.description).toBe('Updated desc');
    });

    it('should update row category and resolve category id', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockSelect.mockReturnValueOnce(createThenableBuilder([{ id: 3, name: 'Transport' }]));
      mockUpdate.mockResolvedValueOnce(1);

      const result = await updateRow(1, 1, 0, { category: 'Transport' });

      expect(result.category).toBe('Transport');
      expect(result.categoryId).toBe(3);
    });

    it('should throw when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      await expect(updateRow(999, 1, 0, { amount: 10 })).rejects.toThrow('Session not found');
    });

    it('should throw when no parsed rows in session', async () => {
      mockFirst.mockResolvedValueOnce({
        ...baseSession, id: 1, parsedRows: null,
      });

      await expect(updateRow(1, 1, 0, { amount: 10 })).rejects.toThrow('No parsed rows in session');
    });

    it('should throw when row index not found', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);

      await expect(updateRow(1, 1, 99, { amount: 10 })).rejects.toThrow('Row not found');
    });

    it('should re-validate and mark row invalid if update introduces error', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await updateRow(1, 1, 0, { amount: 0 });

      expect(result.amount).toBe(0);
      expect(result.errors.some(e => e.field === 'amount')).toBe(true);
    });
  });

  describe('skipRow', () => {
    const parsedRows: ParsedRow[] = [
      {
        rowIndex: 0,
        originalData: {},
        date: '2024-01-15',
        amount: 25.5,
        description: 'Lunch',
        category: 'Food',
        categoryId: 1,
        errors: [],
        skipped: false,
      },
    ];
    const sessionWithRows = {
      ...baseSession,
      id: 1,
      status: 'preview' as const,
      parsedRows: JSON.stringify(parsedRows),
    };

    it('should set skipped to true', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await skipRow(1, 1, 0, true);

      expect(result.skipped).toBe(true);
    });

    it('should set skipped to false when unskipping', async () => {
      const rowsSkipped = [{ ...parsedRows[0], skipped: true }];
      const sessionSkipped = {
        ...sessionWithRows,
        parsedRows: JSON.stringify(rowsSkipped),
      };
      mockFirst.mockResolvedValueOnce(sessionSkipped);
      mockUpdate.mockResolvedValueOnce(1);

      const result = await skipRow(1, 1, 0, false);

      expect(result.skipped).toBe(false);
    });

    it('should throw when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      await expect(skipRow(999, 1, 0, true)).rejects.toThrow('Session not found');
    });

    it('should throw when row not found', async () => {
      mockFirst.mockResolvedValueOnce(sessionWithRows);

      await expect(skipRow(1, 1, 99, true)).rejects.toThrow('Row not found');
    });
  });

  describe('confirmImport', () => {
    const validParsedRows: ParsedRow[] = [
      {
        rowIndex: 0,
        originalData: {},
        date: '2024-01-15',
        amount: 25.5,
        description: 'Lunch',
        category: 'Food',
        categoryId: 1,
        errors: [],
        skipped: false,
      },
    ];
    const sessionPreview = {
      ...baseSession,
      id: 1,
      userId: 1,
      status: 'preview' as const,
      fileName: 'test.csv',
      parsedRows: JSON.stringify(validParsedRows),
    };
    const mockHistory: ImportHistory = {
      id: 1,
      userId: 1,
      sessionId: 1,
      fileName: 'test.csv',
      totalRows: 1,
      importedRows: 1,
      skippedRows: 0,
      createdAt: '2024-01-01T00:00:00Z',
    };

    it('should insert expenses and complete session', async () => {
      const mockTrxInsert = vi.fn().mockResolvedValue([1]);
      const mockTrxUpdate = vi.fn().mockResolvedValue(1);
      const mockTrxWhere = vi.fn().mockReturnThis();
      const mockTrx = vi.fn((table: string) => ({
        insert: mockTrxInsert,
        update: mockTrxUpdate,
        where: mockTrxWhere,
      }));
      mockTransaction.mockImplementation(async (cb: (trx: (table: string) => unknown) => Promise<void>) => {
        await cb(mockTrx);
      });
      mockFirst.mockResolvedValueOnce(sessionPreview);
      mockFirst.mockResolvedValueOnce({ id: 2, name: 'Other' });
      mockFirst.mockResolvedValueOnce(mockHistory);

      const result = await confirmImport(1, 1);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.history).toEqual(mockHistory);
      expect(mockTrx).toHaveBeenCalledWith('expenses');
      expect(mockTrxInsert).toHaveBeenCalledWith({
        userId: 1,
        categoryId: 1,
        amount: 25.5,
        description: 'Lunch',
        date: '2024-01-15',
      });
      expect(mockTrx).toHaveBeenCalledWith('import_sessions');
      expect(mockTrxUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', importedExpenseCount: 1 })
      );
    });

    it('should use default category for rows without categoryId', async () => {
      const rowsNoCategory: ParsedRow[] = [{
        ...validParsedRows[0],
        category: null,
        categoryId: null,
      }];
      const session = { ...sessionPreview, parsedRows: JSON.stringify(rowsNoCategory) };
      const mockTrxInsert = vi.fn().mockResolvedValue([1]);
      const mockTrxUpdate = vi.fn().mockResolvedValue(1);
      const mockTrxWhere = vi.fn().mockReturnThis();
      const mockTrx = vi.fn((table: string) => ({
        insert: mockTrxInsert,
        update: mockTrxUpdate,
        where: mockTrxWhere,
      }));
      mockTransaction.mockImplementation(async (cb: (trx: (table: string) => unknown) => Promise<void>) => {
        await cb(mockTrx);
      });
      mockFirst.mockResolvedValueOnce(session);
      mockFirst.mockResolvedValueOnce({ id: 2, name: 'Other' });
      mockFirst.mockResolvedValueOnce(mockHistory);

      await confirmImport(1, 1);

      expect(mockTrxInsert).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 2 })
      );
    });

    it('should throw when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      await expect(confirmImport(999, 1)).rejects.toThrow('Session not found');
    });

    it('should throw when session not in preview status', async () => {
      mockFirst.mockResolvedValueOnce({
        ...baseSession, id: 1, status: 'upload',
      });

      await expect(confirmImport(1, 1)).rejects.toThrow('Session is not in preview status');
    });

    it('should throw when no parsed rows', async () => {
      mockFirst.mockResolvedValueOnce({
        ...baseSession, id: 1, status: 'preview', parsedRows: null,
      });

      await expect(confirmImport(1, 1)).rejects.toThrow('No parsed rows in session');
    });

    it('should throw when no valid rows to import (all skipped or invalid)', async () => {
      const allSkipped = [{ ...validParsedRows[0], skipped: true }];
      mockFirst.mockResolvedValueOnce({
        ...sessionPreview,
        parsedRows: JSON.stringify(allSkipped),
      });

      await expect(confirmImport(1, 1)).rejects.toThrow('No valid rows to import');
    });

    it('should not import skipped rows', async () => {
      const mixedRows: ParsedRow[] = [
        validParsedRows[0],
        { ...validParsedRows[0], rowIndex: 1, skipped: true },
      ];
      const session = { ...sessionPreview, parsedRows: JSON.stringify(mixedRows) };
      const mockTrxInsert = vi.fn().mockResolvedValue([1]);
      const mockTrxUpdate = vi.fn().mockResolvedValue(1);
      const mockTrxWhere = vi.fn().mockReturnThis();
      const mockTrx = vi.fn((table: string) => ({
        insert: mockTrxInsert,
        update: mockTrxUpdate,
        where: mockTrxWhere,
      }));
      mockTransaction.mockImplementation(async (cb: (trx: (table: string) => unknown) => Promise<void>) => {
        await cb(mockTrx);
      });
      mockFirst.mockResolvedValueOnce(session);
      mockFirst.mockResolvedValueOnce({ id: 2, name: 'Other' });
      mockFirst.mockResolvedValueOnce({
        ...mockHistory,
        importedRows: 1,
        skippedRows: 1,
      });

      const result = await confirmImport(1, 1);

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(mockTrx).toHaveBeenNthCalledWith(1, 'expenses');
      expect(mockTrx).toHaveBeenNthCalledWith(2, 'import_sessions');
      expect(mockTrx).toHaveBeenNthCalledWith(3, 'import_history');
      expect(mockTrxInsert).toHaveBeenCalledTimes(2);
    });

    it('should not import rows with validation errors', async () => {
      const withErrors: ParsedRow[] = [{
        ...validParsedRows[0],
        errors: [{ field: 'amount', message: 'Invalid' }],
      }];
      mockFirst.mockResolvedValueOnce({
        ...sessionPreview,
        parsedRows: JSON.stringify(withErrors),
      });

      await expect(confirmImport(1, 1)).rejects.toThrow('No valid rows to import');
    });
  });

  describe('listImportHistory', () => {
    it('should return history ordered by createdAt desc', async () => {
      const history: ImportHistory[] = [
        {
          id: 1,
          userId: 1,
          sessionId: 1,
          fileName: 'a.csv',
          totalRows: 10,
          importedRows: 10,
          skippedRows: 0,
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 2,
          userId: 1,
          sessionId: 2,
          fileName: 'b.csv',
          totalRows: 5,
          importedRows: 5,
          skippedRows: 0,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockOrderBy.mockReturnValueOnce(createThenableBuilder(history));

      const result = await listImportHistory(1);

      expect(mockDb).toHaveBeenCalledWith('import_history');
      expect(mockWhere).toHaveBeenCalledWith({ userId: 1 });
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(result).toEqual(history);
    });

    it('should return empty array when no history', async () => {
      mockOrderBy.mockReturnValueOnce(createThenableBuilder([]));

      const result = await listImportHistory(99);

      expect(result).toEqual([]);
    });
  });

  describe('getParsedRows', () => {
    it('should return parsed rows from session', async () => {
      const parsedRows: ParsedRow[] = [{
        rowIndex: 0,
        originalData: {},
        date: '2024-01-15',
        amount: 25.5,
        description: 'Lunch',
        category: 'Food',
        categoryId: 1,
        errors: [],
        skipped: false,
      }];
      mockFirst.mockResolvedValueOnce({
        ...baseSession,
        id: 1,
        parsedRows: JSON.stringify(parsedRows),
      });

      const result = await getParsedRows(1, 1);

      expect(result).toEqual(parsedRows);
    });

    it('should return empty array when session not found', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const result = await getParsedRows(999, 1);

      expect(result).toEqual([]);
    });

    it('should return empty array when session has no parsed rows', async () => {
      mockFirst.mockResolvedValueOnce({
        ...baseSession, id: 1, parsedRows: null,
      });

      const result = await getParsedRows(1, 1);

      expect(result).toEqual([]);
    });
  });
});
