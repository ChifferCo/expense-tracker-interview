import Knex from 'knex';
import type { Knex as KnexType } from 'knex';
import path from 'path';

let testDb: KnexType | null = null;

export function createTestDb(): KnexType {
  return Knex({
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../../src/db/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, '../../src/db/seeds'),
      extension: 'ts',
    },
  });
}

export async function setupTestDb(): Promise<KnexType> {
  if (testDb) {
    return testDb;
  }

  testDb = createTestDb();

  // Run migrations
  await testDb.migrate.latest();

  // Run seeds
  await testDb.seed.run();

  return testDb;
}

export async function cleanupTestDb(): Promise<void> {
  if (!testDb) return;

  // Clean all tables except categories (seeded data)
  await testDb('expenses').del();
  await testDb('import_sessions').del();
  await testDb('users').del();

  // Re-seed to ensure consistent state
  await testDb.seed.run();
}

export async function teardownTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

export function getTestDb(): KnexType {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return testDb;
}

export function setTestDb(db: KnexType): void {
  testDb = db;
}
