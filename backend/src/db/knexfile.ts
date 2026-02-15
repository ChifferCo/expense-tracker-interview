import type { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database configuration with environment-based path support.
 *
 * Set DATABASE_PATH env var to use a different database file:
 * - Development: data.db (default)
 * - E2E Tests: test.db
 * - Unit Tests: :memory: (handled separately in test setup)
 *
 * @example
 * DATABASE_PATH=test.db npm run dev
 */
const dbFilename = process.env.DATABASE_PATH || 'data.db';
const dbPath = dbFilename === ':memory:'
  ? ':memory:'
  : path.join(__dirname, '../../', dbFilename);

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
  },
};

export default config;
