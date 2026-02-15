import { beforeAll, afterAll, afterEach } from 'vitest';
import Knex from 'knex';
import type { Knex as KnexType } from 'knex';
import path from 'path';

// Create test database instance
let testDb: KnexType;

beforeAll(async () => {
  testDb = Knex({
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../src/db/migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, '../src/db/seeds'),
      extension: 'ts',
    },
  });

  // Run migrations
  await testDb.migrate.latest();

  // Run seeds
  await testDb.seed.run();
});

afterEach(async () => {
  // Clean tables between tests
  await testDb('expenses').del();
  await testDb('import_sessions').del();
  await testDb('users').del();

  // Re-seed for consistent state
  await testDb.seed.run();
});

afterAll(async () => {
  await testDb.destroy();
});

// Export for use in tests
export { testDb };
