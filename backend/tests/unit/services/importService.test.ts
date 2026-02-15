/**
 * @fileoverview Unit tests for importService
 * Tests CSV import session management, file parsing, column mapping,
 * row validation, and import confirmation with mocked database
 *
 * @see src/services/importService.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock the logger first
vi.mock('../../../src/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock db with inline factory to avoid hoisting issues
vi.mock('../../../src/db/knex.js', () => {
  const createChainMock = () => {
    const chain: Record<string, Mock> = {};
    chain.select = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.whereNotIn = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.first = vi.fn();
    chain.insert = vi.fn();
    chain.update = vi.fn();
    chain.delete = vi.fn();
    return chain;
  };

  const mockDb = vi.fn(() => createChainMock()) as Mock & {
    fn: { now: () => string };
    transaction: Mock;
    __createChainMock: () => Record<string, Mock>;
  };
  mockDb.fn = { now: () => 'NOW()' };
  mockDb.transaction = vi.fn(async (callback: (trx: Mock) => Promise<void>) => {
    const trx = vi.fn(() => ({
      insert: vi.fn().mockResolvedValue([1]),
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue(1),
    })) as Mock;
    await callback(trx);
  });
  mockDb.__createChainMock = createChainMock;

  return { default: mockDb };
});

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
} from '../../../src/services/importService.js';
import db from '../../../src/db/knex.js';

type DbMock = Mock & {
  fn: { now: () => string };
  transaction: Mock;
  __createChainMock: () => Record<string, Mock>;
};
const mockDb = db as unknown as DbMock;

describe('importService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getActiveSession', () => {
    it('should return active session for user', async () => {
      // Arrange
      const mockSession = { id: 1, userId: 1, status: 'upload' };
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(mockSession);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getActiveSession(1);

      // Assert
      expect(result).toEqual(mockSession);
    });

    it('should return null when no active session', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getActiveSession(1);

      // Assert
      expect(result).toBeNull();
    });

    it('should exclude completed and cancelled sessions', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act
      await getActiveSession(1);

      // Assert
      expect(chain.whereNotIn).toHaveBeenCalledWith('status', ['completed', 'cancelled']);
    });
  });

  describe('getSession', () => {
    it('should return session by id and userId', async () => {
      // Arrange
      const mockSession = { id: 1, userId: 1, status: 'upload' };
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(mockSession);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getSession(1, 1);

      // Assert
      expect(result).toEqual(mockSession);
    });

    it('should return null if session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getSession(999, 1);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should cancel existing active sessions before creating new one', async () => {
      // Arrange
      const chain1 = mockDb.__createChainMock();
      chain1.update.mockResolvedValue(1);

      const chain2 = mockDb.__createChainMock();
      chain2.insert.mockResolvedValue([1]);

      const chain3 = mockDb.__createChainMock();
      chain3.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1) // Cancel existing sessions
        .mockReturnValueOnce(chain2) // Insert new session
        .mockReturnValueOnce(chain3); // Get created session

      // Act
      await createSession(1);

      // Assert
      expect(chain1.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
    });

    it('should create new session with upload status', async () => {
      // Arrange
      const chain1 = mockDb.__createChainMock();
      chain1.update.mockResolvedValue(0);

      const chain2 = mockDb.__createChainMock();
      chain2.insert.mockResolvedValue([1]);

      const chain3 = mockDb.__createChainMock();
      chain3.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      // Act
      const result = await createSession(1);

      // Assert
      expect(chain2.insert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, status: 'upload' })
      );
      expect(result.status).toBe('upload');
    });
  });

  describe('cancelSession', () => {
    it('should cancel active session', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.update.mockResolvedValue(1);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await cancelSession(1, 1);

      // Assert
      expect(result).toBe(true);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
    });

    it('should return false if session already completed/cancelled', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.update.mockResolvedValue(0);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await cancelSession(1, 1);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('uploadCsv', () => {
    const validCsv = 'Date,Amount,Description,Category\n2024-01-15,100,Groceries,Food\n2024-01-16,50,Bus fare,Transport';

    it('should parse CSV and detect structure', async () => {
      // Arrange
      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue(null);

      const chain2 = mockDb.__createChainMock();
      chain2.update.mockResolvedValue(0);

      const chain3 = mockDb.__createChainMock();
      chain3.insert.mockResolvedValue([1]);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      const chain5 = mockDb.__createChainMock();
      chain5.update.mockResolvedValue(1);

      const chain6 = mockDb.__createChainMock();
      chain6.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4)
        .mockReturnValueOnce(chain5)
        .mockReturnValueOnce(chain6);

      // Act
      const result = await uploadCsv(1, 'test.csv', validCsv);

      // Assert
      expect(result.structure.headers).toEqual(['Date', 'Amount', 'Description', 'Category']);
      expect(result.structure.rowCount).toBe(2);
      expect(result.structure.delimiter).toBe(',');
    });

    it('should suggest column mapping based on headers', async () => {
      // Arrange
      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      const chain2 = mockDb.__createChainMock();
      chain2.update.mockResolvedValue(1);

      const chain3 = mockDb.__createChainMock();
      chain3.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      // Act
      const result = await uploadCsv(1, 'test.csv', validCsv);

      // Assert
      expect(result.structure.suggestedMapping).toEqual({
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
        category: 'Category',
      });
    });

    it('should throw error for CSV with only header row', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(uploadCsv(1, 'test.csv', 'Date,Amount,Description'))
        .rejects.toThrow('CSV must have at least a header row and one data row');
    });

    it('should detect semicolon delimiter', async () => {
      // Arrange
      const semicolonCsv = 'Date;Amount;Description\n2024-01-15;100;Groceries';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      const chain2 = mockDb.__createChainMock();
      chain2.update.mockResolvedValue(1);

      const chain3 = mockDb.__createChainMock();
      chain3.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      // Act
      const result = await uploadCsv(1, 'test.csv', semicolonCsv);

      // Assert
      expect(result.structure.delimiter).toBe(';');
    });

    it('should detect tab delimiter', async () => {
      // Arrange
      const tabCsv = 'Date\tAmount\tDescription\n2024-01-15\t100\tGroceries';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      const chain2 = mockDb.__createChainMock();
      chain2.update.mockResolvedValue(1);

      const chain3 = mockDb.__createChainMock();
      chain3.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      // Act
      const result = await uploadCsv(1, 'test.csv', tabCsv);

      // Assert
      expect(result.structure.delimiter).toBe('\t');
    });
  });

  describe('saveMapping', () => {
    it('should throw error when session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(saveMapping(999, 1, { date: 'Date', amount: 'Amount', description: 'Description' }))
        .rejects.toThrow('Session not found');
    });

    it('should throw error when no CSV data in session', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, rawCsvData: null });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' }))
        .rejects.toThrow('No CSV data in session');
    });

    it('should parse rows and count valid/invalid', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,100,Groceries\n,invalid,';
      const mockSession = { id: 1, userId: 1, rawCsvData: csvData, status: 'upload' };

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue(mockSession);

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([
        { id: 1, name: 'Food' },
        { id: 6, name: 'Other' },
      ]);

      const chain3 = mockDb.__createChainMock();
      chain3.select.mockResolvedValue([
        { id: 1, name: 'Food' },
        { id: 6, name: 'Other' },
      ]);

      const chain4 = mockDb.__createChainMock();
      chain4.update.mockResolvedValue(1);

      const chain5 = mockDb.__createChainMock();
      chain5.first.mockResolvedValue({ ...mockSession, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1) // getSession
        .mockReturnValueOnce(chain2) // categories query row 1
        .mockReturnValueOnce(chain3) // categories query row 2
        .mockReturnValueOnce(chain4) // update session
        .mockReturnValueOnce(chain5); // get updated session

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
      expect(result.parsedRows).toHaveLength(2);
    });
  });

  describe('updateRow', () => {
    it('should throw error when session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(updateRow(999, 1, 0, { amount: 200 }))
        .rejects.toThrow('Session not found');
    });

    it('should throw error when no parsed rows in session', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, parsedRows: null });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(updateRow(1, 1, 0, { amount: 200 }))
        .rejects.toThrow('No parsed rows in session');
    });

    it('should throw error when row not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({
        id: 1,
        userId: 1,
        parsedRows: JSON.stringify([{ rowIndex: 0, date: '2024-01-15', amount: 100, description: 'Test', errors: [] }]),
      });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(updateRow(1, 1, 999, { amount: 200 }))
        .rejects.toThrow('Row not found');
    });
  });

  describe('skipRow', () => {
    it('should throw error when session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(skipRow(999, 1, 0, true))
        .rejects.toThrow('Session not found');
    });

    it('should toggle skip status on row', async () => {
      // Arrange
      const parsedRows = [
        { rowIndex: 0, date: '2024-01-15', amount: 100, description: 'Test', skipped: false, errors: [] },
      ];

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({
        id: 1,
        userId: 1,
        parsedRows: JSON.stringify(parsedRows),
      });

      const chain2 = mockDb.__createChainMock();
      chain2.update.mockResolvedValue(1);

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2);

      // Act
      const result = await skipRow(1, 1, 0, true);

      // Assert
      expect(result.skipped).toBe(true);
    });
  });

  describe('confirmImport', () => {
    it('should throw error when session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(confirmImport(999, 1))
        .rejects.toThrow('Session not found');
    });

    it('should throw error when session not in preview status', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, status: 'upload' });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(confirmImport(1, 1))
        .rejects.toThrow('Session is not in preview status');
    });

    it('should throw error when no parsed rows in session', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, status: 'preview', parsedRows: null });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(confirmImport(1, 1))
        .rejects.toThrow('No parsed rows in session');
    });

    it('should throw error when no valid rows to import', async () => {
      // Arrange
      const parsedRows = [
        { rowIndex: 0, skipped: false, errors: [{ field: 'amount', message: 'Invalid' }] },
      ];
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({
        id: 1,
        userId: 1,
        status: 'preview',
        parsedRows: JSON.stringify(parsedRows),
      });
      mockDb.mockReturnValue(chain);

      // Act & Assert
      await expect(confirmImport(1, 1))
        .rejects.toThrow('No valid rows to import');
    });
  });

  describe('listImportHistory', () => {
    it('should return import history for user', async () => {
      // Arrange
      const mockHistory = [
        { id: 1, userId: 1, fileName: 'test.csv', importedRows: 5 },
      ];
      const chain = mockDb.__createChainMock();
      chain.orderBy.mockResolvedValue(mockHistory);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await listImportHistory(1);

      // Assert
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getParsedRows', () => {
    it('should return empty array when session not found', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue(null);
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getParsedRows(999, 1);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when session has no parsed rows', async () => {
      // Arrange
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({ id: 1, userId: 1, parsedRows: null });
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getParsedRows(1, 1);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return parsed rows from session', async () => {
      // Arrange
      const parsedRows = [
        { rowIndex: 0, date: '2024-01-15', amount: 100, description: 'Test' },
      ];
      const chain = mockDb.__createChainMock();
      chain.first.mockResolvedValue({
        id: 1,
        userId: 1,
        parsedRows: JSON.stringify(parsedRows),
      });
      mockDb.mockReturnValue(chain);

      // Act
      const result = await getParsedRows(1, 1);

      // Assert
      expect(result).toEqual(parsedRows);
    });
  });
});

/**
 * CSV Parsing Helper Tests
 * Tests date format parsing, amount parsing, CSV line handling, and row validation
 */
describe('importService - CSV parsing helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('date parsing', () => {
    it('should parse YYYY-MM-DD format', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,100,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].date).toBe('2024-01-15');
    });

    it('should parse MM/DD/YYYY format', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n01/15/2024,100,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].date).toBe('2024-01-15');
    });

    it('should parse DD-MM-YYYY format', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n15-01-2024,100,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].date).toBe('2024-01-15');
    });
  });

  describe('amount parsing', () => {
    it('should parse currency symbols', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,$100.50,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].amount).toBe(100.5);
    });

    it('should parse negative amounts in parentheses', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,(50.00),Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].amount).toBe(-50);
    });
  });

  describe('CSV line parsing', () => {
    it('should handle quoted fields with commas', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,100,"Groceries, food"';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].description).toBe('Groceries, food');
    });

    it('should handle escaped quotes', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,100,"Test ""quoted"" text"';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].description).toBe('Test "quoted" text');
    });
  });

  describe('row validation', () => {
    it('should mark rows with missing date as invalid', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n,100,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].errors).toContainEqual(
        expect.objectContaining({ field: 'date' })
      );
    });

    it('should mark rows with zero or negative amount as invalid', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,0,Test';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].errors).toContainEqual(
        expect.objectContaining({ field: 'amount' })
      );
    });

    it('should mark rows with empty description as invalid', async () => {
      // Arrange
      const csvData = 'Date,Amount,Description\n2024-01-15,100,';

      const chain1 = mockDb.__createChainMock();
      chain1.first.mockResolvedValue({ id: 1, rawCsvData: csvData });

      const chain2 = mockDb.__createChainMock();
      chain2.select.mockResolvedValue([{ id: 6, name: 'Other' }]);

      const chain3 = mockDb.__createChainMock();
      chain3.update.mockResolvedValue(1);

      const chain4 = mockDb.__createChainMock();
      chain4.first.mockResolvedValue({ id: 1, status: 'preview' });

      mockDb
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3)
        .mockReturnValueOnce(chain4);

      // Act
      const result = await saveMapping(1, 1, { date: 'Date', amount: 'Amount', description: 'Description' });

      // Assert
      expect(result.parsedRows[0].errors).toContainEqual(
        expect.objectContaining({ field: 'description' })
      );
    });
  });
});
