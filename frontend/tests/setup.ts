/**
 * @fileoverview Vitest setup file for frontend tests
 *
 * This file runs before all test files and configures the test environment:
 * - Extends Vitest with jest-dom matchers (toBeInTheDocument, toHaveValue, etc.)
 * - Starts the MSW server to mock API requests
 * - Resets handlers between tests for isolation
 * - Closes the server after all tests complete
 *
 * ## Configuration
 * This file is referenced in vitest.config.ts under `setupFiles`.
 *
 * ## MSW Server Lifecycle
 * - beforeAll: Start server with strict request handling
 * - afterEach: Reset handlers to default state
 * - afterAll: Close server and clean up
 *
 * @see tests/mocks/handlers.ts - API mock handlers
 * @see tests/mocks/server.ts - MSW server instance
 * @see vitest.config.ts - Test configuration
 */

import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
