import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupTestDb, cleanupTestDb, teardownTestDb, getTestDb } from '../helpers/testDb.js';

// Mock the database module to use our test database
vi.mock('../../src/db/knex.js', async () => {
  const { getTestDb } = await import('../helpers/testDb.js');
  return {
    default: getTestDb(),
  };
});

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});
