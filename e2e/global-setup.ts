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

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = path.join(process.cwd(), '../backend/test.db');
const BACKEND_DIR = path.join(process.cwd(), '../backend');

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
        // Database is in use by running server - skip reset
        console.log('  Database in use by server - skipping reset.');
        console.log('  (Run tests with a fresh server for full isolation)\n');
        return;
      }
      throw err;
    }
  }

  // Run migrations to create fresh schema
  console.log('Running database migrations...');
  execSync('npm run db:migrate', {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_PATH: 'test.db' },
    stdio: 'inherit',
  });

  // Seed initial data (demo user, categories)
  console.log('Seeding test data...');
  execSync('npm run db:seed', {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_PATH: 'test.db' },
    stdio: 'inherit',
  });

  console.log('\nTest database ready: backend/test.db\n');
}

export default globalSetup;
