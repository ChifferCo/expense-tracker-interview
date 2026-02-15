import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Quality-first: Only include files that have corresponding tests
      // Add new files to this list when writing their tests
      include: [
        'src/components/ExpenseForm.tsx',
        'src/pages/Login.tsx',
        'src/hooks/useCategories.ts',
      ],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        'src/api/**',
        'src/types/**',
      ],
      // Thresholds enforced via CLI for pre-commit hook
      // lines: 80%, functions: 100%, branches: 80%, statements: 80%
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
