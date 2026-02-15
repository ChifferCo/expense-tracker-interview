/**
 * @fileoverview Playwright Global Setup - Test Database Initialization
 *
 * This script runs once before all E2E tests to ensure a clean, isolated
 * test database. It:
 * 1. Deletes any existing test database file
 * 2. Creates a fresh database with migrations
 * 3. Seeds initial data (demo user, categories)
 *
 * The test database (test.db) is completely separate from the development
 * database (data.db), ensuring E2E tests don't pollute development data.
 *
 * @see playwright.config.ts - Configures this as globalSetup
 * @see backend/src/db/knexfile.ts - DATABASE_PATH env var support
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../backend/test.db');

async function globalSetup() {
  console.log('\n=== E2E Test Database Setup ===\n');

  // Step 1: Delete existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    console.log('Removing existing test database...');
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Step 2: Run migrations to create fresh schema
  console.log('Running database migrations...');
  execSync('npm run db:migrate', {
    cwd: path.join(__dirname, '../backend'),
    env: { ...process.env, DATABASE_PATH: 'test.db' },
    stdio: 'inherit',
  });

  // Step 3: Seed initial data (demo user, categories)
  console.log('Seeding test data...');
  execSync('npm run db:seed', {
    cwd: path.join(__dirname, '../backend'),
    env: { ...process.env, DATABASE_PATH: 'test.db' },
    stdio: 'inherit',
  });

  console.log('\nTest database ready: backend/test.db\n');
}

export default globalSetup;
