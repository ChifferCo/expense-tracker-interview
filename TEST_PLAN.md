# Expense Tracker - Testing Implementation Plan

> **Primary Goal**: Comprehensive test coverage at all layers with proper isolation
> **Tech Stack**: Vitest, Supertest, React Testing Library, Playwright
> **Philosophy**: Tests should be isolated, reproducible, and maintainable

---

## Testing Philosophy

### Core Principles

1. **Isolation** - Tests should not depend on or affect each other
2. **Reproducibility** - Tests produce the same results every run
3. **Clarity** - Test failures clearly indicate what broke
4. **Maintainability** - Test code follows the same quality standards as production code
5. **Speed** - Tests run fast enough to be part of the development workflow

### Test Pyramid

```
        /\
       /  \      E2E Tests (critical user journeys)
      /----\
     /      \    Integration Tests (API routes, DB operations)
    /--------\
   /          \  Component Tests (React components)
  /------------\
 /              \ Unit Tests (pure functions, services)
/________________\
```

### Database Strategy

- **Separate test database** - Never share with development or production
- **Reset before runs** - Start each test suite with known state
- **Isolated transactions** - Tests don't pollute each other

### Test User Strategy

- **Reusable test users** - Shared users for most test cases (reduces setup overhead)
- **Dedicated test users** - Only when tests require:
  - Specific user roles/permissions
  - Isolated state that shouldn't affect other tests
  - Testing user-specific flows (registration, onboarding)

---

## Executive Summary

| Phase | Focus | Duration | Coverage Target |
|-------|-------|----------|-----------------|
| 1 | Test Infrastructure | 30 min | N/A |
| 2 | Backend Unit Tests | 45 min | 100% services |
| 3 | Backend Integration Tests | 45 min | 100% routes |
| 4 | Frontend Component Tests | 30 min | 70%+ components |
| 5 | E2E Tests (Playwright) | 45 min | Critical paths |
| 6 | Security & Bug Coverage | 30 min | Document all issues |
| 7 | CI/CD & Documentation | 30 min | Pipeline + docs |

**Total Estimated Time**: ~4.5 hours

---

## Tech Stack & Justification

| Layer | Tool | Why Chosen |
|-------|------|------------|
| **Test Runner** | Vitest | Native TypeScript, fast HMR, Jest-compatible API |
| **Backend Integration** | Supertest | Industry standard for Express, clean API |
| **Frontend Components** | React Testing Library | Tests behavior not implementation |
| **API Mocking** | MSW | Network-level interception, works in browser + Node |
| **E2E Testing** | Playwright | Cross-browser, auto-wait, powerful selectors |
| **Coverage** | V8 (via Vitest) | Native Node.js coverage, accurate metrics |

---

## Phase 1: Test Infrastructure

### Goals
- [ ] Configure separate test database
- [ ] Create reusable test user fixtures
- [ ] Set up database reset for test runs
- [ ] Create test helpers and utilities

### 1.1 Database Isolation

**Problem:** Shared database causes test data accumulation, flaky tests, and unpredictable state.

**Solution:** Environment-based database configuration.

**File: `backend/src/db/knexfile.ts`**
```typescript
import type { Knex } from 'knex';
import path from 'path';

const baseConfig: Partial<Knex.Config> = {
  client: 'better-sqlite3',
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

const config: Record<string, Knex.Config> = {
  development: {
    ...baseConfig,
    connection: { filename: path.join(__dirname, '../../data.db') },
  },
  test: {
    ...baseConfig,
    connection: { filename: path.join(__dirname, '../../test.db') },
  },
};

export default config;
```

**File: `backend/src/db/knex.ts`**
```typescript
import Knex from 'knex';
import config from './knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const db = Knex(config[environment]);

export default db;
```

**Add npm scripts to `backend/package.json`:**
```json
{
  "scripts": {
    "db:migrate:test": "NODE_ENV=test knex migrate:latest",
    "db:seed:test": "NODE_ENV=test knex seed:run",
    "db:reset:test": "NODE_ENV=test knex migrate:rollback --all && npm run db:migrate:test && npm run db:seed:test"
  }
}
```

### 1.2 Test User Fixtures

**File: `backend/src/db/seeds/001_seed.ts`** (update)
```typescript
// Insert test users with different roles/states
await knex('users').insert([
  { id: 1, email: 'demo@example.com', passwordHash },      // Default user with expenses
  { id: 2, email: 'admin@example.com', passwordHash },     // Admin role (if applicable)
  { id: 3, email: 'empty@example.com', passwordHash },     // User with no expenses
  { id: 4, email: 'fresh@example.com', passwordHash },     // For onboarding tests
]);

// Only seed expenses for demo user
await knex('expenses').insert(expenses.map(e => ({ ...e, userId: 1 })));
```

**File: `e2e/support/fixtures/users.fixture.ts`**
```typescript
export const TEST_USERS = {
  default: { email: 'demo@example.com', password: 'password123' },
  admin: { email: 'admin@example.com', password: 'password123' },
  empty: { email: 'empty@example.com', password: 'password123' },
  fresh: { email: 'fresh@example.com', password: 'password123' },
} as const;

export const DEMO_USER = TEST_USERS.default;
```

### 1.3 Playwright Global Setup

**File: `e2e/support/global-setup.ts`**
```typescript
import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('Resetting test database...');
  execSync('npm run db:reset:test', {
    cwd: '../backend',
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  console.log('Test database ready.');
}
```

**Update `e2e/playwright.config.ts`:**
```typescript
export default defineConfig({
  globalSetup: require.resolve('./support/global-setup.ts'),
  // ... rest of config
});
```

### 1.4 Backend Test Helpers

**File: `backend/tests/helpers/testDb.ts`**
```typescript
import Knex from 'knex';
import config from '../../src/db/knexfile';

const testDb = Knex(config.test);

export async function setupTestDb() {
  await testDb.migrate.latest();
  await testDb.seed.run();
}

export async function cleanupTestDb() {
  await testDb('expenses').del();
  await testDb('import_sessions').del();
}

export async function teardownTestDb() {
  await testDb.destroy();
}

export { testDb };
```

**File: `backend/tests/helpers/fixtures.ts`**
```typescript
import bcrypt from 'bcryptjs';
import { generateToken } from '../../src/middleware/auth';
import { testDb } from './testDb';

export async function createTestUser(overrides = {}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const userData = {
    email: `test-${Date.now()}@example.com`,
    passwordHash,
    ...overrides,
  };

  const [id] = await testDb('users').insert(userData);
  const user = await testDb('users').where({ id }).first();
  const token = generateToken(id);

  return { user, token };
}

export async function createTestExpense(userId: number, overrides = {}) {
  const expenseData = {
    userId,
    categoryId: 1,
    amount: 50.00,
    description: `Test expense ${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    ...overrides,
  };

  const [id] = await testDb('expenses').insert(expenseData);
  return testDb('expenses').where({ id }).first();
}

export function getAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
```

### Deliverables
- [ ] Test database configuration (`knexfile.ts`)
- [ ] Database reset scripts in `package.json`
- [ ] Test user fixtures with different roles
- [ ] Playwright global setup for DB reset
- [ ] Backend test helpers (`testDb.ts`, `fixtures.ts`)

---

## Phase 2: Backend Unit Tests

### Goals
- [ ] 100% coverage on service layer
- [ ] Test all pure functions in isolation
- [ ] Document edge cases and bugs found

### Test Files to Create

**File: `backend/tests/unit/services/importService.test.ts`** (~65 tests)

| Function | Test Cases |
|----------|------------|
| `detectDelimiter` | comma, semicolon, tab, ambiguous |
| `parseCsvLine` | simple, quoted fields, escaped quotes, empty fields |
| `parseDate` | ISO, US format, EU format, invalid, whitespace |
| `parseAmount` | integer, decimal, currency symbols, thousands separator, negative |
| `validateRow` | valid, missing date, zero amount, empty description, multiple errors |
| `suggestMapping` | date keywords, amount keywords, case-insensitive |

**File: `backend/tests/unit/services/authService.test.ts`** (~6 tests)

| Function | Test Cases |
|----------|------------|
| `register` | success, duplicate email, password hashing |
| `login` | success, wrong password, non-existent user |

**File: `backend/tests/unit/services/expenseService.test.ts`** (~6 tests)

| Function | Test Cases |
|----------|------------|
| `getMonthlyTotal` | correct sum, empty month, month boundaries |

**File: `backend/tests/unit/middleware/auth.test.ts`** (~7 tests)

| Function | Test Cases |
|----------|------------|
| `authenticateToken` | no token (401), invalid (403), expired (403), valid (next called) |
| `generateToken` | valid JWT, 24h expiration, payload encoded |

### Deliverables
- [ ] ~74 unit tests passing
- [ ] 100% line coverage on pure functions
- [ ] Run: `cd backend && npm test -- --coverage`

---

## Phase 3: Backend Integration Tests

### Goals
- [ ] 100% coverage on route handlers
- [ ] Test full request/response cycle
- [ ] Verify authorization rules

### Test Files to Create

**File: `backend/tests/integration/auth.routes.test.ts`** (~8 tests)

| Endpoint | Test Cases |
|----------|------------|
| `POST /api/auth/register` | 201 success, 400 invalid email, 400 short password, 409 duplicate |
| `POST /api/auth/login` | 200 success, 401 wrong password, 401 non-existent |

**File: `backend/tests/integration/expenses.routes.test.ts`** (~18 tests)

| Endpoint | Test Cases |
|----------|------------|
| `GET /api/expenses` | 401 no auth, 200 user isolation, filtering, pagination |
| `GET /api/expenses/:id` | 200 success, 404 not found, 404 other user's |
| `POST /api/expenses` | 201 success, 400 validation errors |
| `PUT /api/expenses/:id` | 200 success, 404 not found, 404 authorization |
| `DELETE /api/expenses/:id` | 204 success, 404 not found |

**File: `backend/tests/integration/import.routes.test.ts`** (~12 tests)

| Endpoint | Test Cases |
|----------|------------|
| `POST /api/import/session` | 201 creates, cancels existing |
| `POST /api/import/upload` | 201 parses CSV, 400 empty file |
| `POST /api/import/session/:id/confirm` | 200 imports expenses |

### Deliverables
- [ ] ~39 integration tests passing
- [ ] 100% route coverage
- [ ] Authorization fully tested

---

## Phase 4: Frontend Component Tests

### Goals
- [ ] 70%+ coverage on components
- [ ] Test user interactions
- [ ] Test form validation and loading states

### Test Files to Create

**File: `frontend/tests/components/ExpenseForm.test.tsx`** (~10 tests)
- Renders all fields
- Validation errors for invalid input
- Calls onSubmit with valid data
- Loading state handling
- Edit mode with initial data

**File: `frontend/tests/components/ExpenseList.test.tsx`** (~6 tests)
- Renders expense items
- Formats amounts as currency
- Edit/delete button callbacks
- Empty state

**File: `frontend/tests/pages/Login.test.tsx`** (~8 tests)
- Login/register form display
- Demo credentials hint
- Error message display
- Loading state

**File: `frontend/tests/pages/Dashboard.test.tsx`** (~6 tests)
- Stats display (monthly spending, count)
- Recent expenses list
- Loading/empty states

### Deliverables
- [ ] ~40 component tests passing
- [ ] 70%+ coverage
- [ ] Run: `cd frontend && npm test -- --coverage`

---

## Phase 5: E2E Tests (Playwright)

### Goals
- [ ] Cover critical user journeys
- [ ] Test full stack integration
- [ ] Use Page Object Model pattern

### 5.1 Directory Structure

```
e2e/
├── playwright.config.ts
├── support/
│   ├── index.ts
│   ├── global-setup.ts
│   ├── fixtures/
│   │   ├── auth.fixture.ts
│   │   ├── users.fixture.ts
│   │   └── test-data.fixture.ts
│   └── page-objects/
│       ├── login.page.ts
│       ├── dashboard.page.ts
│       ├── expenses.page.ts
│       └── expense-form.page.ts
└── tests/
    ├── auth/
    ├── dashboard/
    ├── expenses/
    ├── navigation/
    ├── security/
    └── bugs/
```

### 5.2 Page Objects

**Guidelines:**
- One page object per logical page/component
- Locators as getters (lazy evaluation)
- Actions as async methods
- Assertions as `expect*` methods
- No test logic in page objects

### 5.3 Test Data Factory

```typescript
export const TestDataFactory = {
  futureDate(): string {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 10);
    return future.toISOString().split('T')[0];
  },

  expense(overrides = {}) {
    return {
      amount: '42.50',
      description: `Test expense ${Date.now()}`,
      date: this.futureDate(), // Ensures visibility in sorted lists
      ...overrides,
    };
  },
};
```

### 5.4 Test Suites

**File: `e2e/tests/auth/*.spec.ts`** (~11 tests)
- Login success/failure
- Registration success/duplicate
- Logout
- Session persistence
- Protected routes

**File: `e2e/tests/expenses/crud.spec.ts`** (~8 tests)
- Display expenses list
- Create expense
- Edit expense
- Delete expense with confirmation
- Form validation

**File: `e2e/tests/expenses/filtering.spec.ts`** (~4 tests)
- Search by description
- Date filter options
- Custom date range

**File: `e2e/tests/navigation/*.spec.ts`** (~10 tests)
- Sidebar navigation
- URL routing
- Protected route redirects

**File: `e2e/tests/security/*.spec.ts`** (~6 tests)
- XSS prevention
- Input validation
- Authentication required

### Deliverables
- [ ] ~50 E2E tests passing
- [ ] Page Object Models created
- [ ] Run: `npm run test:e2e`

---

## Phase 6: Bug Documentation & Fixes

### Goals
- [ ] Write tests that expose known bugs
- [ ] Run tests to prove bugs exist (tests FAIL)
- [ ] Apply code fixes
- [ ] Re-run tests to verify fixes (tests PASS)

### Workflow Pattern

For each bug:
1. **Write the test** - Asserts correct/expected behavior
2. **Run the test** - Observe FAILURE (proves bug exists)
3. **Apply the fix** - Modify source code
4. **Re-run the test** - Observe PASS (proves bug is fixed)

---

### BUG-001: Amount Field Accepts "e" Character

**Problem:** HTML `<input type="number">` allows scientific notation (e.g., `1e5` = 100000)

**Test File:** `e2e/tests/bugs/amount-validation.spec.ts`

```typescript
test('should reject "e" character in amount field', async ({ authenticatedPage }) => {
  // Arrange
  const expenseForm = new ExpenseFormPage(authenticatedPage);
  await expenseForm.goto();

  // Act - type "e" in amount field
  await expenseForm.amountInput.fill('1e5');

  // Assert - should show validation error or reject input
  await expect(expenseForm.amountInput).toHaveValue('');
  // Or: await expect(page.getByText('Invalid amount')).toBeVisible();
});
```

**Fix Location:** `frontend/src/components/ExpenseForm.tsx`

```tsx
// Add onKeyDown handler to prevent "e", "E", "+", "-"
<input
  type="number"
  onKeyDown={(e) => {
    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  }}
  // ... other props
/>
```

---

### BUG-003: Dashboard Delete Button Does Nothing

**Problem:** Dashboard passes empty function `() => {}` to `onDelete` prop

**Test File:** `e2e/tests/bugs/dashboard-delete.spec.ts`

```typescript
test('should delete expense from dashboard', async ({ authenticatedPage }) => {
  // Arrange - create expense and navigate to dashboard
  const dashboardPage = new DashboardPage(authenticatedPage);
  // ... create expense first

  // Act - click delete button
  await dashboardPage.clickDeleteOnExpense(expense.description);

  // Assert - confirmation modal should appear
  await expect(authenticatedPage.getByRole('heading', { name: 'Delete Expense' }))
    .toBeVisible({ timeout: 2000 });
});
```

**Fix Location:** `frontend/src/pages/Dashboard.tsx`

```tsx
// Before (broken):
<ExpenseList
  expenses={recentExpenses}
  onEdit={onEditExpense}
  onDelete={() => {}}  // Empty function - does nothing
/>

// After (fixed):
import { useDeleteExpense } from '../hooks/useExpenses';

const Dashboard = ({ onEditExpense }: DashboardProps) => {
  const { mutate: deleteExpense } = useDeleteExpense();

  const handleDelete = (expenseId: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(expenseId);
    }
  };

  return (
    <ExpenseList
      expenses={recentExpenses}
      onEdit={onEditExpense}
      onDelete={handleDelete}  // Pass actual handler
    />
  );
};
```

---

### BUG-004: Date Timezone Off-by-One

**Problem:** `new Date('2024-06-15')` interprets as midnight UTC, displays as previous day in US timezones

**Test File:** `e2e/tests/bugs/date-timezone.spec.ts`

```typescript
test('should display date exactly as entered', async ({ authenticatedPage }) => {
  // Arrange
  const expensesPage = new ExpensesPage(authenticatedPage);
  const testDate = '2035-06-15';

  // Act - create expense with specific date
  await expenseForm.createExpense({
    amount: '25',
    description: uniqueDesc,
    date: testDate,
  });

  // Assert - should show "Jun 15" not "Jun 14"
  const expenseItem = expensesPage.getExpenseItem(uniqueDesc);
  const displayedDate = await expenseItem.textContent();
  expect(displayedDate).toContain('Jun 15');
});
```

**Fix Location:** `frontend/src/components/ExpenseList.tsx`

```tsx
// Before (broken):
new Date(expense.date).toLocaleDateString('en-US', { ... })

// After (fixed) - parse date parts manually to avoid timezone issues:
const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // Local timezone, not UTC
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
```

---

### BUG-005: Amount Decimal Precision

**Problem:** Backend accepts `3.144` and stores full precision; display shows rounded value

**Test File:** `backend/tests/integration/security.test.ts`

```typescript
test('should reject amount with more than 2 decimal places', async () => {
  const response = await request(app)
    .post('/api/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 3.144, description: 'Test', date: '2024-01-15', categoryId: 1 });

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('2 decimal places');
});
```

**Fix Location:** `backend/src/routes/expenses.ts` (Zod validation schema)

```typescript
import { z } from 'zod';

const expenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number()
    .positive('Amount must be greater than 0')
    .refine((val) => {
      // Check decimal places: multiply by 100 and verify it's an integer
      return Number.isInteger(val * 100);
    }, { message: 'Amount can only have up to 2 decimal places' }),
  description: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});
```

---

### Security Issues (Documentation)

| ID | Risk | Severity | Test |
|----|------|----------|------|
| SEC-1 | Hardcoded JWT secret | Critical | Verify env var required in production |
| SEC-2 | No rate limiting | High | 10 rapid requests should trigger 429 |
| SEC-3 | CORS allows all origins | Medium | Evil origin should be blocked |
| SEC-4 | Demo credentials visible | Medium | Conditional rendering for production |

---

### Test Location

```
e2e/tests/bugs/
├── amount-validation.spec.ts   # BUG-001
├── dashboard-delete.spec.ts    # BUG-003
└── date-timezone.spec.ts       # BUG-004

backend/tests/integration/
└── security.test.ts            # BUG-005
```

### Summary Table

| Bug ID | Component | Severity | Status |
|--------|-----------|----------|--------|
| BUG-001 | ExpenseForm | Medium | Test written, fix documented |
| BUG-003 | Dashboard | Medium | Test written, fix documented |
| BUG-004 | ExpenseList | Medium | Test written, fix documented |
| BUG-005 | Backend API | High | Test written, fix documented |

### Deliverables
- [ ] Bug tests written (expected to FAIL initially)
- [ ] Run tests to prove bugs exist
- [ ] Apply code fixes per documentation above
- [ ] Re-run tests to verify all PASS
- [ ] Security issues documented

---

## Phase 7: CI/CD & Documentation

### 7.1 GitHub Actions Workflow

**File: `.github/workflows/test.yml`**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
          npm ci

      - name: Run backend tests
        run: cd backend && npm test -- --coverage

      - name: Run frontend tests
        run: cd frontend && npm test -- --coverage

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            backend/coverage
            frontend/coverage
            playwright-report
```

### 7.2 Test Scripts (root `package.json`)

```json
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:e2e": "npx playwright test --config=e2e/playwright.config.ts",
    "test:e2e:ui": "npx playwright test --ui",
    "test:coverage": "npm run test:backend -- --coverage && npm run test:frontend -- --coverage"
  }
}
```

### 7.3 Documentation

**Update `README.md`:**
- Add testing section with commands
- Document environment variables

**Create `TESTING.md`** (≤150 lines):
- Test strategy overview
- How to run tests
- Writing new tests

### Deliverables
- [ ] CI workflow passing
- [ ] Test scripts configured
- [ ] Documentation updated

---

## Commands Reference

```bash
# All tests
npm test                          # Backend + frontend unit/integration
npm run test:e2e                  # Playwright E2E

# With coverage
npm run test:coverage             # Generate coverage reports

# Individual layers
cd backend && npm test            # Backend only
cd frontend && npm test           # Frontend only

# E2E variations
npm run test:e2e:ui               # Interactive UI mode
npx playwright test --headed      # See browser
npx playwright test --debug       # Debug mode

# Database
cd backend && npm run db:reset:test   # Reset test database
```

---

## Success Criteria

- [ ] All unit/integration tests pass (excluding bug documentation)
- [ ] E2E tests pass consistently
- [ ] Backend coverage ≥ 90%
- [ ] Frontend coverage ≥ 70%
- [ ] No flaky tests
- [ ] CI pipeline green
- [ ] Test database fully isolated
