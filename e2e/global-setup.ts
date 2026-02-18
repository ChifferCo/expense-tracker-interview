/**
 * @fileoverview Playwright Global Setup - Test Database Initialization
 *
 * This script runs once before all E2E tests to ensure a clean, isolated
 * test database. It either:
 * 1. Deletes and recreates the database (if no server is using it)
 * 2. Or truncates tables and re-seeds (if the database is in use)
 *
 * The test database (test.db) is completely separate from the development
 * database (data.db), ensuring E2E tests don't pollute development data.
 *
 * @see playwright.config.ts - Configures this as globalSetup
 * @see backend/src/db/knexfile.ts - DATABASE_PATH env var support
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Use process.cwd() which is the project root when running via npm scripts
// This is more reliable than __dirname or import.meta.url across different runtimes
const PROJECT_ROOT = process.cwd();
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const TEST_DB_PATH = path.join(BACKEND_DIR, 'test.db');

/**
 * Run npm script in a cross-platform way
 * Uses spawnSync with shell: true to ensure proper Windows compatibility
 */
function runNpmScript(script: string, cwd: string, env: Record<string, string> = {}): void {
  const result = spawnSync('npm', ['run', script], {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with exit code ${result.status}`);
  }
}

async function globalSetup() {
  console.log('\n=== E2E Test Database Setup ===\n');

  const dbExists = fs.existsSync(TEST_DB_PATH);

  if (dbExists) {
    // Try to delete the database file
    console.log('Attempting to reset test database...');
    try {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('  Deleted existing database.');
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EBUSY') {
        // Database is in use by running server - reset via rollback instead
        console.log('  Database in use - resetting via rollback...');
        try {
          // Rollback all migrations (drops tables)
          runNpmScript('db:rollback', BACKEND_DIR, { DATABASE_PATH: 'test.db' });
          // Run migrations again
          console.log('  Running migrations...');
          runNpmScript('db:migrate', BACKEND_DIR, { DATABASE_PATH: 'test.db' });
          // Seed fresh data
          console.log('  Seeding test data...');
          runNpmScript('db:seed', BACKEND_DIR, { DATABASE_PATH: 'test.db' });
          console.log('\nTest database reset complete.\n');
          return;
        } catch (resetErr) {
          console.error('  Failed to reset database via rollback:', resetErr);
          throw resetErr;
        }
      }
      throw err;
    }
  }

  // Run migrations to create fresh schema
  console.log('Running database migrations...');
  runNpmScript('db:migrate', BACKEND_DIR, { DATABASE_PATH: 'test.db' });

  // Seed initial data (demo user, categories)
  console.log('Seeding test data...');
  runNpmScript('db:seed', BACKEND_DIR, { DATABASE_PATH: 'test.db' });

  console.log('\nTest database ready: backend/test.db\n');
}

export default globalSetup;
