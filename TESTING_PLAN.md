# Expense Tracker - Testing Implementation Plan

> **Primary Goal**: Achieve comprehensive code coverage at all testing layers
> **Secondary Goals**: Identify security risks, bugs, and code improvements
> **Tech Stack**: Vitest, Supertest, React Testing Library, Playwright

---

## Quick Reference: Claude Code Prompts

Copy-paste these prompts into a fresh Claude Code session to execute each phase.
These prompts are **self-contained** - no prior context needed.

> **Tip**: Each phase section below contains the full detailed prompt.

---

## Executive Summary

| Phase | Focus | Duration | Coverage Target |
|-------|-------|----------|-----------------|
| 1 | Setup & Infrastructure | 30 min | N/A |
| 2 | Backend Unit Tests | 45 min | 100% services |
| 3 | Backend Integration Tests | 45 min | 100% routes |
| 4 | Frontend Component Tests | 30 min | 70%+ components |
| 5 | E2E Tests (Playwright) | 45 min | Critical paths |
| 6 | Security & Bug Test Coverage | 30 min | Tests expose all issues |
| 7 | Documentation & JSDoc | 30 min | Essential docs only |

**Total Estimated Time**: ~4.5 hours

---

## Testing Tech Stack

### Chosen Tools & Justification

| Layer | Tool | Why Chosen |
|-------|------|------------|
| **Test Runner** | Vitest | Native TypeScript support, fast HMR, Vite-compatible, Jest-compatible API |
| **Backend Integration** | Supertest | Industry standard for Express testing, clean API, no server startup needed |
| **Frontend Components** | React Testing Library | Tests user behavior not implementation, encourages accessibility, React ecosystem standard |
| **API Mocking** | MSW (Mock Service Worker) | Intercepts at network level, works in browser and Node, realistic mocking |
| **E2E Testing** | Playwright | Cross-browser support, auto-wait, powerful selectors, better than Cypress for complex apps |
| **Coverage** | V8 (via Vitest) | Native Node.js coverage, fast, accurate line/branch/function metrics |
| **Pre-commit** | Husky + lint-staged | Git hooks made easy, runs only on staged files, prevents bad commits |

### Why Not Other Options?

| Alternative | Reason Not Chosen |
|-------------|-------------------|
| Jest | Slower than Vitest, requires more config for TypeScript/ESM |
| Cypress | Single browser at a time, heavier, less suitable for cross-browser |
| Enzyme | Deprecated, encourages testing implementation details |
| Nock | Only works in Node, MSW works in browser too |
| Mocha/Chai | More setup, less integrated, no built-in coverage |

---

## Test Commands

### Quick Reference

```bash
# Run all tests
npm test

# Run with coverage reports
npm run test:coverage

# Run individual layers
npm run test:backend      # Backend unit + integration
npm run test:frontend     # Frontend component tests
npm run test:e2e          # Playwright E2E tests
```

### Detailed Commands

| Command | Location | Description |
|---------|----------|-------------|
| `npm test` | Root | Run all backend + frontend tests |
| `npm run test:backend` | Root | Run backend tests only |
| `npm run test:frontend` | Root | Run frontend tests only |
| `npm run test:e2e` | Root | Run Playwright E2E tests |
| `npm run test:coverage` | Root | Run all tests with coverage |
| `cd backend && npm test` | Backend | Run backend tests |
| `cd backend && npm test -- --coverage` | Backend | Backend with coverage |
| `cd backend && npm test -- --watch` | Backend | Backend in watch mode |
| `cd frontend && npm test` | Frontend | Run frontend tests |
| `cd frontend && npm test -- --coverage` | Frontend | Frontend with coverage |
| `cd frontend && npm test -- --watch` | Frontend | Frontend in watch mode |
| `npx playwright test` | Root/e2e | Run all E2E tests |
| `npx playwright test --ui` | Root/e2e | Open Playwright UI mode |
| `npx playwright test --project=chromium` | Root/e2e | Run only in Chrome |
| `npx playwright show-report` | Root/e2e | View HTML test report |
| `npx playwright codegen localhost:5173` | Root/e2e | Generate test code |

### Coverage Reports

After running with `--coverage`, reports are generated at:
- Backend: `backend/coverage/index.html`
- Frontend: `frontend/coverage/index.html`

---

## Phase 1: Setup & Infrastructure

### Goals
- [ ] Install all testing dependencies
- [ ] Configure test runners
- [ ] Set up test database utilities
- [ ] Create reusable test helpers
- [ ] Configure pre-commit hooks (Husky + lint-staged)

### Claude Code Prompt
```
Set up test infrastructure for an expense tracker app.

Project structure:
- backend/: Express + Knex + SQLite (better-sqlite3)
- frontend/: React + Vite + TanStack Query
- Tech: TypeScript throughout, Vitest for testing

Tasks:
1. Install backend deps: npm install -D supertest @types/supertest (in backend/)
2. Install frontend deps: npm install -D @testing-library/user-event msw@latest (in frontend/)
3. Run: npm init playwright@latest (at project root, select e2e/ folder)

4. Create directories:
   - backend/tests/{unit/services, unit/middleware, integration, helpers, fixtures}
   - frontend/tests/{components, pages, hooks, mocks}
   - e2e/{tests, page-objects, fixtures}

5. Create backend/tests/helpers/testDb.ts:
   - Use better-sqlite3 in-memory database
   - Run Knex migrations programmatically
   - Export: setupTestDb(), cleanupTestDb(), teardownTestDb()

6. Create backend/tests/helpers/testApp.ts:
   - Import Express app from src/index.ts (refactor if needed to export app without listen)
   - Export app for supertest usage

7. Create backend/tests/helpers/fixtures.ts:
   - createTestUser(overrides?) → { user, token }
   - createTestExpense(userId, overrides?) → expense
   - getAuthHeaders(token) → { Authorization: 'Bearer ...' }

8. Create frontend/tests/mocks/handlers.ts:
   - MSW handlers for: /api/auth/*, /api/expenses/*, /api/categories, /api/import/*

9. Create frontend/tests/mocks/server.ts:
   - setupServer() from msw/node

10. Create frontend/tests/setup.ts:
    - Import @testing-library/jest-dom
    - beforeAll: server.listen()
    - afterEach: server.resetHandlers()
    - afterAll: server.close()

11. Create backend/vitest.config.ts with v8 coverage provider, 100% thresholds

12. Set up Husky + lint-staged:
    - npm install -D husky lint-staged (at root)
    - npx husky init
    - Pre-commit: run eslint --fix --max-warnings 0 and tsc --noEmit

Verify: npm test runs in both backend/ and frontend/ without errors.
Do NOT write actual tests - infrastructure only.
```

### Tasks

#### 1.1 Backend Dependencies
```bash
cd backend
npm install -D supertest @types/supertest
```

#### 1.2 Frontend Dependencies
```bash
cd frontend
npm install -D @testing-library/user-event msw@latest
```

#### 1.3 Playwright Setup
```bash
# From project root
npm init playwright@latest
# Select: TypeScript, e2e folder, GitHub Actions workflow
```

#### 1.4 Create Directory Structure
```
backend/
└── tests/
    ├── unit/
    │   ├── services/
    │   └── middleware/
    ├── integration/
    ├── helpers/
    │   ├── testDb.ts
    │   ├── testApp.ts
    │   └── fixtures.ts
    └── fixtures/
        └── *.csv

frontend/
└── tests/
    ├── components/
    ├── pages/
    ├── hooks/
    └── mocks/
        ├── handlers.ts
        └── server.ts

e2e/
├── tests/
├── page-objects/
├── fixtures/
└── playwright.config.ts
```

#### 1.5 Backend Test Helpers

**File: `backend/tests/helpers/testDb.ts`**
- Create in-memory SQLite database
- Run migrations programmatically
- Seed with test data
- Clean between tests
- Teardown after all tests

**File: `backend/tests/helpers/testApp.ts`**
- Export Express app without starting server
- Configure for test environment

**File: `backend/tests/helpers/fixtures.ts`**
- `createTestUser()` - returns user with auth token
- `createTestExpense()` - returns expense for user
- `getAuthHeaders()` - returns Authorization header

#### 1.6 Frontend Test Helpers

**File: `frontend/tests/mocks/handlers.ts`**
- MSW request handlers for all API endpoints
- Mock responses for success cases
- Mock responses for error cases

**File: `frontend/tests/mocks/server.ts`**
- MSW server setup for Node environment

**File: `frontend/tests/setup.ts`**
- Import jest-dom matchers
- Start/stop MSW server

#### 1.7 Vitest Coverage Configuration

**File: `backend/vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**/*.ts', 'src/middleware/**/*.ts'],
      exclude: ['src/db/**', 'src/types/**', 'src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
```

#### 1.8 Pre-commit Hooks (Husky + lint-staged)

**Install dependencies (from project root):**
```bash
npm install -D husky lint-staged
npx husky init
```

**Configure `package.json` (root):**
```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "backend/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "bash -c 'cd backend && npx tsc --noEmit'"
    ],
    "frontend/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "bash -c 'cd frontend && npx tsc --noEmit'"
    ]
  }
}
```

**Create `.husky/pre-commit`:**
```bash
npx lint-staged
```

**What it catches:**
| Check | Prevents |
|-------|----------|
| ESLint | Lint errors, unused imports, code style violations |
| TypeScript | Type errors, missing types, incorrect usage |
| Max warnings 0 | No warnings allowed (strict mode) |

**Optional: Add test runner to pre-commit:**
```bash
# Only run tests for changed files (faster)
npx lint-staged && npm test -- --changed
```

### Deliverables
- [ ] All dependencies installed
- [ ] Directory structure created
- [ ] `testDb.ts` working with in-memory SQLite
- [ ] `testApp.ts` exporting Express app
- [ ] MSW handlers for all endpoints
- [ ] `npm test` runs without errors (0 tests)
- [ ] Husky pre-commit hooks installed
- [ ] lint-staged configured (ESLint + TypeScript)
- [ ] Pre-commit hook verified working

---

## Phase 2: Backend Unit Tests

### Goals
- [ ] 80%+ coverage on service layer
- [ ] Test all pure functions in isolation
- [ ] Document edge cases and bugs found

### Claude Code Prompt
```
Write backend unit tests for an expense tracker Express app. Target: 100% line coverage.

Project uses: Vitest, TypeScript, Knex, better-sqlite3, bcryptjs, jsonwebtoken.
Test location: backend/tests/unit/

Step 1: Export pure functions from backend/src/services/importService.ts (add at bottom):
export { detectDelimiter, parseCsvLine, parseCsv, suggestMapping, parseDate, parseAmount, validateRow };

Step 2: Create backend/tests/unit/services/importService.test.ts (~65 tests):
- detectDelimiter(content): comma, semicolon, tab, empty content, ambiguous (pick highest count)
- parseCsvLine(line, delimiter): simple values, quoted fields with delimiter inside, escaped quotes "", empty fields, single field
- parseCsv(content, delimiter): multiple lines, \n and \r\n line endings, skip empty lines
- suggestMapping(headers): detect date/time/when/day → date column, amount/price/cost/total → amount, description/desc/note/memo/item → description, category/type/group → category, case-insensitive, partial matches
- parseDate(dateStr): YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, YYYY/MM/DD, whitespace trimming, null for empty, null for invalid
- parseAmount(amountStr): integers, decimals, $€£ symbols, commas as thousands separator, (50.00) as negative, null for invalid
- validateRow(row): valid returns [], missing date error, null/zero/negative amount errors, empty description error, multiple errors

Step 3: Create backend/tests/unit/services/authService.test.ts (~5 tests):
- register: creates user with hashed password, returns token, throws on duplicate email
- login: returns token for valid credentials, throws for wrong password, throws for non-existent user

Step 4: Create backend/tests/unit/services/expenseService.test.ts (~4 tests):
- getMonthlyTotal: correct sum, 0 for empty month, handles month boundaries (use mocked db)

Step 5: Create backend/tests/unit/middleware/auth.test.ts (~7 tests):
- authenticateToken: 401 when no header, 401 when no token after Bearer, 403 for invalid token, 403 for expired token, calls next() and sets req.user for valid token
- generateToken: returns valid JWT, encodes userId in payload, sets 24h expiration

Run: cd backend && npm test -- --coverage
Target: 100% line coverage on src/services/*.ts and src/middleware/auth.ts
```

### Tasks

#### 2.1 Export Pure Functions for Testing

**Modify: `backend/src/services/importService.ts`**
```typescript
// Add at bottom of file:
export {
  detectDelimiter,
  parseCsvLine,
  parseCsv,
  suggestMapping,
  parseDate,
  parseAmount,
  validateRow,
};
```

#### 2.2 Import Service Unit Tests

**File: `backend/tests/unit/services/importService.test.ts`**

| Function | Test Cases |
|----------|------------|
| `detectDelimiter` | comma, semicolon, tab, ambiguous |
| `parseCsvLine` | simple, quoted fields, escaped quotes, empty fields |
| `parseDate` | ISO, US format, EU format, invalid, whitespace |
| `parseAmount` | integer, decimal, currency symbols ($€£), thousands separator, negative (parentheses), invalid |
| `validateRow` | valid, missing date, zero amount, negative amount, empty description, multiple errors |
| `suggestMapping` | date keywords, amount keywords, description keywords, category keywords, case-insensitive |

**Test Count**: ~35 tests

#### 2.3 Auth Service Unit Tests

**File: `backend/tests/unit/services/authService.test.ts`**

| Function | Test Cases |
|----------|------------|
| `register` | success, duplicate email, password hashing |
| `login` | success, wrong password, non-existent user |

**Test Count**: ~6 tests

#### 2.4 Expense Service Unit Tests

**File: `backend/tests/unit/services/expenseService.test.ts`**

| Function | Test Cases |
|----------|------------|
| `getMonthlyTotal` | correct calculation, empty month, leap year Feb, Dec/Jan boundary |

**Test Count**: ~6 tests

#### 2.5 Auth Middleware Unit Tests

**File: `backend/tests/unit/middleware/auth.test.ts`**

| Function | Test Cases |
|----------|------------|
| `authenticateToken` | no token (401), invalid token (403), expired token (403), valid token (next called) |
| `generateToken` | valid JWT structure, 24h expiration, payload encoded |

**Test Count**: ~7 tests

### Test Count Summary

| Function Group | Tests |
|----------------|-------|
| `detectDelimiter` | 6 |
| `parseCsvLine` | 11 |
| `parseCsv` | 5 |
| `suggestMapping` | 28 |
| `parseDate` | 18 |
| `parseAmount` | 15 |
| `validateRow` | 13 |
| `authenticateToken` | 6 |
| `generateToken` | 3 |
| **Total Unit Tests** | **~74** |

### Deliverables
- [ ] ~74 unit tests passing
- [ ] 100% line coverage on pure functions
- [ ] Bugs documented (see Phase 6)

---

## Phase 3: Backend Integration Tests

### Goals
- [ ] 90%+ coverage on route handlers
- [ ] Test full request/response cycle
- [ ] Verify authorization rules
- [ ] Test database operations

### Claude Code Prompt
```
Write backend integration tests for an expense tracker Express API. Target: 100% route coverage.

Project uses: Vitest, Supertest, Express, Knex, better-sqlite3, JWT auth.
Test location: backend/tests/integration/
Backend runs on port 3002, API prefix: /api

Setup pattern for each test file:
- beforeAll: set up in-memory test database, run migrations
- beforeEach: seed test data, create test user with token
- afterEach: clean database tables
- afterAll: close database connection

Create backend/tests/integration/auth.routes.test.ts (~8 tests):
POST /api/auth/register:
  - 201: valid email + password (min 6 chars) → returns { user, token }
  - 400: invalid email format
  - 400: password too short (<6)
  - 409: duplicate email
POST /api/auth/login:
  - 200: valid credentials → returns { user, token }
  - 401: wrong password
  - 401: non-existent email
  - 400: missing email or password field

Create backend/tests/integration/expenses.routes.test.ts (~18 tests):
All expense routes require Authorization: Bearer <token> header.
GET /api/expenses:
  - 401: no auth header
  - 200: returns only current user's expenses (create 2 users, verify isolation)
  - 200: ?startDate=YYYY-MM-DD filters correctly
  - 200: ?endDate=YYYY-MM-DD filters correctly
  - 200: ?search=text filters by description
  - 200: ?limit=10&offset=0 pagination works
GET /api/expenses/:id:
  - 200: returns expense if owned by user
  - 404: expense doesn't exist
  - 404: expense owned by different user (authorization)
POST /api/expenses:
  - 201: valid { categoryId, amount, description, date }
  - 400: negative amount
  - 400: zero amount
  - 400: invalid date format
  - 400: empty description
PUT /api/expenses/:id:
  - 200: updates and returns expense
  - 404: not found
  - 404: other user's expense (authorization)
DELETE /api/expenses/:id:
  - 204: deletes successfully
  - 404: not found
  - 404: other user's expense (authorization)
GET /api/expenses/monthly-total?year=2026&month=2:
  - 200: returns correct sum
  - 200: returns 0 for month with no expenses

Create backend/tests/integration/import.routes.test.ts (~12 tests):
POST /api/import/session: 201 creates, auto-cancels existing
GET /api/import/session: 200 returns active, 404 if none
DELETE /api/import/session/:id: 204 success, 404 not found
POST /api/import/upload: 201 parses CSV, 400 empty file
POST /api/import/session/:id/mapping: 200 saves mapping, 400 missing required
POST /api/import/session/:id/confirm: 200 imports to expenses table

Create backend/tests/integration/categories.routes.test.ts (~1 test):
GET /api/categories: 200 returns seeded categories array

Run: cd backend && npm test -- --coverage
```

### Tasks

#### 3.1 Auth Routes Integration Tests

**File: `backend/tests/integration/auth.routes.test.ts`**

| Endpoint | Test Cases |
|----------|------------|
| `POST /api/auth/register` | 201 success, 400 invalid email, 400 short password, 409 duplicate |
| `POST /api/auth/login` | 200 success, 401 wrong password, 401 non-existent, 400 missing fields |

**Test Count**: ~8 tests

#### 3.2 Expense Routes Integration Tests

**File: `backend/tests/integration/expenses.routes.test.ts`**

| Endpoint | Test Cases |
|----------|------------|
| `GET /api/expenses` | 401 no auth, 200 returns user's only, filter by date, filter by search, pagination |
| `GET /api/expenses/:id` | 200 success, 404 not found, 404 other user's |
| `POST /api/expenses` | 201 success, 400 negative amount, 400 zero amount, 400 invalid date, 400 empty description |
| `PUT /api/expenses/:id` | 200 success, 404 not found, 404 other user's (authz) |
| `DELETE /api/expenses/:id` | 204 success, 404 not found, 404 other user's (authz) |
| `GET /api/expenses/monthly-total` | 200 correct sum, 200 zero for empty month |

**Test Count**: ~18 tests

#### 3.3 Import Routes Integration Tests

**File: `backend/tests/integration/import.routes.test.ts`**

| Endpoint | Test Cases |
|----------|------------|
| `POST /api/import/session` | 201 creates session, cancels existing |
| `GET /api/import/session` | 200 returns active, 404 no active |
| `DELETE /api/import/session/:id` | 204 success, 404 not found |
| `POST /api/import/upload` | 201 success, 400 empty file, 400 no header |
| `POST /api/import/session/:id/mapping` | 200 success, 400 missing required, 404 session not found |
| `POST /api/import/session/:id/confirm` | 200 imports expenses, 400 no valid rows |

**Test Count**: ~12 tests

#### 3.4 Categories Routes Integration Tests

**File: `backend/tests/integration/categories.routes.test.ts`**

| Endpoint | Test Cases |
|----------|------------|
| `GET /api/categories` | 200 returns all categories |

**Test Count**: ~1 test

### Test Count Summary

| Function/Route Group | Tests |
|---------------------|-------|
| Auth routes | 8 |
| Expense routes | 18 |
| Import routes | 12 |
| Categories routes | 1 |
| `matchCategory` (db) | 10 |
| Import session functions | 20 |
| Expense service (db) | 14 |
| Auth service (db) | 5 |
| **Total Integration Tests** | **~54** |

**Combined with Phase 2:** 74 unit + 54 integration = **128 backend tests**

### Deliverables
- [ ] ~54 integration tests passing
- [ ] 100% line coverage on routes
- [ ] Authorization fully tested
- [ ] All endpoints documented

---

## Phase 4: Frontend Component Tests

### Goals
- [ ] 70%+ coverage on components
- [ ] Test user interactions
- [ ] Test form validation
- [ ] Test loading/error states

### Claude Code Prompt
```
Write frontend component tests for an expense tracker React app. Target: 70% coverage.

Project uses: React 18, Vite, Vitest, React Testing Library, MSW, TanStack Query, Tailwind.
Test location: frontend/tests/
API base: http://localhost:3002/api

Test setup pattern:
- Wrap components in QueryClientProvider (new QueryClient per test)
- Wrap in MemoryRouter if component uses routing
- Use MSW to mock API responses (handlers in frontend/tests/mocks/handlers.ts)
- Use @testing-library/user-event for interactions

Create frontend/tests/components/ExpenseForm.test.tsx (~10 tests):
Props: { onSubmit, onCancel, initialData?, isLoading? }
- Renders all fields: category (select), amount (number), description (text), date (date)
- Renders Submit and Cancel buttons
- Shows validation error when amount is 0 or negative on submit
- Shows validation error when description is empty on submit
- Shows validation error when date is missing on submit
- Calls onSubmit with form data when valid
- Does NOT call onSubmit when validation fails
- Disables submit button when isLoading=true
- Shows "Saving..." text when isLoading=true
- Populates fields from initialData when editing
- Shows "Update" instead of "Create" when initialData provided

Create frontend/tests/components/ExpenseList.test.tsx (~6 tests):
Props: { expenses, onEdit, onDelete }
- Renders list of expense items with description, amount, category, date
- Formats amounts as currency ($XX.XX)
- Shows category name/icon for each expense
- Calls onEdit(expense) when edit button clicked
- Calls onDelete(expense.id) when delete button clicked
- Shows empty state message when expenses array is empty

Create frontend/tests/components/ImportWizard.test.tsx (~10 tests):
Multi-step wizard: Upload → Mapping → Preview → Complete
- Starts on upload step
- Shows step progress indicator
- Accepts CSV file via file input or drag-drop
- Shows error for non-CSV file
- Shows column mapping dropdowns after upload
- Validates required mappings (date, amount, description) before proceeding
- Shows valid/invalid row counts in preview
- Allows toggling skip checkbox on rows
- Shows success message with imported count on complete
- Calls onComplete callback when finished

Create frontend/tests/pages/Login.test.tsx (~8 tests):
- Shows email and password fields
- Shows login button by default
- Displays demo credentials hint (demo@example.com)
- Toggles to register mode when clicking register link
- Submits login with entered credentials
- Shows API error message on failed login
- Disables button and shows loading state during submission

Create frontend/tests/pages/Dashboard.test.tsx (~6 tests):
- Shows monthly spending total (formatted currency)
- Shows expense count
- Shows % change compared to last month
- Displays 5 most recent expenses
- Shows loading skeleton while fetching
- Handles empty state (no expenses)

Run: cd frontend && npm test -- --coverage
```

### Tasks

#### 4.1 ExpenseForm Component Tests

**File: `frontend/tests/components/ExpenseForm.test.tsx`**

| Scenario | Test Cases |
|----------|------------|
| Rendering | all fields render, submit/cancel buttons |
| Validation | error for amount ≤ 0, error for empty description, error for missing date |
| Submission | calls onSubmit with valid data, doesn't call with invalid |
| Loading | disables button, shows "Saving..." |
| Editing | populates initial data, shows "Update" button |

**Test Count**: ~10 tests

#### 4.2 ExpenseList Component Tests

**File: `frontend/tests/components/ExpenseList.test.tsx`**

| Scenario | Test Cases |
|----------|------------|
| Rendering | displays expenses, shows category icons, formats amounts |
| Actions | calls onEdit when edit clicked, calls onDelete when delete clicked |
| Empty | shows empty state |

**Test Count**: ~6 tests

#### 4.3 ImportWizard Component Tests

**File: `frontend/tests/components/ImportWizard.test.tsx`**

| Scenario | Test Cases |
|----------|------------|
| Steps | starts on upload, shows progress indicator |
| Upload | accepts CSV file, shows error for invalid |
| Mapping | shows suggested mappings, validates required fields |
| Preview | shows valid/invalid counts, allows skip row |
| Complete | shows success message, calls onComplete |

**Test Count**: ~10 tests

#### 4.4 Login Page Tests

**File: `frontend/tests/pages/Login.test.tsx`**

| Scenario | Test Cases |
|----------|------------|
| Rendering | login form by default, shows demo credentials |
| Mode switch | toggles to register mode |
| Submission | calls onLogin/onRegister with credentials |
| Error | displays error message |
| Loading | disables button, shows "Loading..." |

**Test Count**: ~8 tests

#### 4.5 Dashboard Page Tests

**File: `frontend/tests/pages/Dashboard.test.tsx`**

| Scenario | Test Cases |
|----------|------------|
| Rendering | shows monthly spending, shows expense count |
| Comparison | shows % change vs last month |
| Recent | displays recent expenses |
| Loading | shows loading state |
| Empty | handles no expenses |

**Test Count**: ~6 tests

### Deliverables
- [ ] ~40 component tests passing
- [ ] 70%+ coverage on components
- [ ] All forms validated
- [ ] All user interactions tested

---

## Phase 5: E2E Tests (Playwright)

### Goals
- [ ] Cover critical user journeys
- [ ] Test full stack integration
- [ ] Visual regression baseline
- [ ] Cross-browser validation

### Claude Code Prompt
```
Write E2E tests with Playwright for an expense tracker full-stack app.

Stack: React frontend (Vite, port 5173) + Express backend (port 3002) + SQLite.
Test location: e2e/
Use Page Object Model pattern. Each test should be independent (fresh login).

Create e2e/playwright.config.ts:
- testDir: './tests'
- fullyParallel: true
- retries: 2 on CI, 0 locally
- projects: chromium, firefox, webkit
- webServer: auto-start both servers:
  - { command: 'npm run dev', cwd: 'backend', port: 3002 }
  - { command: 'npm run dev', cwd: 'frontend', port: 5173 }
- use: { baseURL: 'http://localhost:5173', screenshot: 'only-on-failure', trace: 'on-first-retry' }
- reporter: [['html'], ['list']]

Create Page Object Models (e2e/page-objects/):

LoginPage.ts:
- goto(): navigate to /login
- login(email, password): fill form, click submit, wait for navigation
- register(email, password): switch to register mode, fill, submit
- expectError(message): assert error message visible
- getEmailInput(), getPasswordInput(), getSubmitButton()

DashboardPage.ts:
- expectLoaded(): assert dashboard elements visible
- getMonthlySpending(): return spending amount text
- getRecentExpenses(): return array of expense elements

ExpensesPage.ts:
- goto(): navigate to /expenses
- addExpense({ category, amount, description, date }): open modal, fill, submit
- editExpense(index, updates): click edit on nth expense, update fields, save
- deleteExpense(index): click delete on nth expense, confirm
- search(query): type in search box, wait for filter
- getExpenseList(): return expense row elements

ImportPage.ts:
- goto(): navigate to /import
- uploadFile(filePath): upload CSV file
- setMapping({ date, amount, description, category }): select column mappings
- confirmImport(): click confirm, wait for completion
- getPreviewRows(): return preview table rows

Create e2e/tests/auth.spec.ts (~5 tests):
- Login with valid credentials → redirects to dashboard
- Login with wrong password → shows error message
- Register new user with unique email → redirects to dashboard
- Register with existing email → shows duplicate error
- Logout → redirects to login page

Create e2e/tests/expenses.spec.ts (~5 tests):
- Add expense → new expense appears in list with correct values
- Edit expense → updated values shown in list
- Delete expense → expense removed from list
- Search by description → only matching expenses shown
- Filter by date range → only expenses in range shown

Create e2e/tests/import.spec.ts (~3 tests):
- Import valid CSV → all rows imported, appear in expense list
- Import CSV with invalid rows → can skip invalid, import valid only
- Cancel import → no new expenses added

Create e2e/tests/dashboard.spec.ts (~2 tests):
- Monthly total shows correct sum of current month expenses
- Comparison shows % change from previous month

Run: npx playwright test
Debug: npx playwright test --ui
Report: npx playwright show-report
```

### Tasks

#### 5.1 Playwright Configuration

**File: `e2e/playwright.config.ts`**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      port: 3002,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

#### 5.2 Page Object Models

**File: `e2e/page-objects/LoginPage.ts`**
- `goto()`, `login()`, `register()`, `expectError()`

**File: `e2e/page-objects/DashboardPage.ts`**
- `expectLoaded()`, `getMonthlySpending()`, `getRecentExpenses()`

**File: `e2e/page-objects/ExpensesPage.ts`**
- `goto()`, `addExpense()`, `editExpense()`, `deleteExpense()`, `search()`

**File: `e2e/page-objects/ImportPage.ts`**
- `goto()`, `uploadFile()`, `setMapping()`, `confirmImport()`

#### 5.3 E2E Test Suites

**File: `e2e/tests/auth.spec.ts`**

| Test | Steps |
|------|-------|
| Login success | goto → login → expect dashboard |
| Login failure | goto → bad credentials → expect error |
| Register success | goto → register → expect dashboard |
| Register duplicate | goto → register existing → expect error |
| Logout | login → logout → expect login page |

**Test Count**: ~5 tests

**File: `e2e/tests/expenses.spec.ts`**

| Test | Steps |
|------|-------|
| Add expense | login → add expense → verify in list |
| Edit expense | login → add → edit → verify changed |
| Delete expense | login → add → delete → verify removed |
| Filter by search | login → add multiple → search → verify filtered |
| Filter by date | login → add multiple dates → filter → verify |

**Test Count**: ~5 tests

**File: `e2e/tests/import.spec.ts`**

| Test | Steps |
|------|-------|
| Import valid CSV | login → upload → map → preview → confirm → verify |
| Handle invalid rows | login → upload with errors → skip invalid → confirm |
| Cancel import | login → upload → cancel → verify no changes |

**Test Count**: ~3 tests

**File: `e2e/tests/dashboard.spec.ts`**

| Test | Steps |
|------|-------|
| Shows monthly total | login → add expenses → verify total |
| Shows comparison | login → add this/last month → verify % change |

**Test Count**: ~2 tests

### Deliverables
- [ ] ~15 E2E tests passing
- [ ] Page Object Models created
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Trace files for debugging
- [ ] HTML report generated

---

## Phase 6: Security & Bug Test Coverage

### Goals
- [ ] Write tests that expose all identified security issues
- [ ] Write tests that expose all identified bugs
- [ ] Verify tests fail as expected (proving bugs exist)
- [ ] Document test results (pass/fail) for each issue

### Claude Code Prompt
```
Write tests that expose security vulnerabilities and bugs in an expense tracker app.
DO NOT FIX THE CODE - only write tests. Tests should FAIL to prove bugs exist.

Project: Express backend (port 3002) + React frontend (port 5173) + SQLite.
Test tools: Vitest, Supertest, React Testing Library, Playwright.

SECURITY TESTS (expect these to FAIL):

1. backend/tests/security/jwt-secret.test.ts:
   - Set NODE_ENV=production, unset JWT_SECRET env var
   - Import auth middleware, expect it to throw error on startup
   - EXPECTED: FAIL (secret is hardcoded as 'your-secret-key', no env check)

2. backend/tests/security/rate-limiting.test.ts:
   - Send 10 rapid POST /api/auth/login requests
   - Expect 429 Too Many Requests after 5 attempts
   - EXPECTED: FAIL (no rate limiting implemented)

3. backend/tests/security/cors.test.ts:
   - Send request with Origin: http://evil-site.com header
   - Expect request to be blocked (no Access-Control-Allow-Origin)
   - EXPECTED: FAIL (CORS allows all origins with cors() default)

4. frontend/tests/security/amount-scientific.test.tsx:
   - Render ExpenseForm, type "1e5" or "2E3" in amount field
   - Submit form, expect validation error OR input to block 'e' key
   - EXPECTED: FAIL (HTML number input accepts scientific notation)

5. Integration + E2E XSS test:
   - POST /api/expenses with description: "<script>alert('xss')</script>"
   - E2E: view expense in list, verify script renders as text not executed
   - DOCUMENT: Does React escape it? (likely PASS - React escapes by default)

6. e2e/tests/security/demo-credentials.spec.ts:
   - Navigate to /login
   - Assert that text "demo@example.com" is NOT visible on page
   - EXPECTED: FAIL (demo credentials displayed as hint)

BUG TESTS (expect these to FAIL):

1. Unit test - BUG-1 inconsistent negative handling:
   - parseAmount("(50.00)") returns -50
   - validateRow({ amount: -50, ... }) returns error "must be positive"
   - Document this inconsistency

2. Integration test - BUG-2 empty search:
   - GET /api/expenses?search= (empty string)
   - Verify behavior (does it filter or return all?)

3. Integration test - BUG-3 description length:
   - POST /api/expenses with 300-character description
   - Expect 400 error (Zod schema limits to 255)

4. E2E test - BUG-4 dashboard delete broken:
   - Login, go to dashboard, click delete on recent expense
   - Expect expense to be removed from list
   - EXPECTED: FAIL (delete button has no onClick handler)

5. E2E test - BUG-5 dashboard edit redirects:
   - Login, go to dashboard, click edit on recent expense
   - Expect edit modal to open
   - EXPECTED: FAIL (button navigates to /expenses instead)

6. Component test - BUG-6 future dates allowed:
   - Render ExpenseForm, select tomorrow's date
   - Submit form, expect validation error "Date cannot be in future"
   - EXPECTED: FAIL (no max date validation)

7. E2E test - BUG-7 timezone date shift:
   - Create expense with date "2026-01-31"
   - Verify expense list shows "2026-01-31" (not "2026-01-30")
   - EXPECTED: FAIL (UTC conversion shifts date in some timezones)

OUTPUT: Create all tests, run them, document which PASS and which FAIL.
Failing tests prove the bug exists and need fixing in a future phase.
```

### Identified Security Risks

| ID | Risk | Severity | Location | Fix |
|----|------|----------|----------|-----|
| SEC-1 | Hardcoded JWT secret | **Critical** | `backend/src/middleware/auth.ts:6` | Use env var, fail if not set in production |
| SEC-2 | No rate limiting on auth | **High** | `backend/src/routes/auth.ts` | Add express-rate-limit |
| SEC-3 | No password complexity | **Medium** | `backend/src/routes/auth.ts:10` | Require uppercase, number, special char |
| SEC-4 | JWT in localStorage | **Medium** | `frontend/src/hooks/useAuth.ts` | Consider httpOnly cookies |
| SEC-5 | No CORS restriction | **Medium** | `backend/src/index.ts:12` | Restrict to frontend origin |
| SEC-6 | No input sanitization | **Low** | Various | Add express-validator or rely on Zod |

### Identified Bugs

| ID | Bug | Severity | Location | Test to Write |
|----|-----|----------|----------|---------------|
| BUG-1 | Amount parsing allows negative but validation rejects | **Low** | `importService.ts:147-161 vs 201` | Unit test: parseAmount("-50") returns value, validateRow rejects it |
| BUG-2 | Empty search returns no filter (potential perf) | **Low** | `expenseService.ts:54-56` | Integration test: search with "" vs undefined behavior |
| BUG-3 | No max length on description | **Low** | `expenseService.ts` | Integration test: POST with 256+ char description |
| BUG-4 | Dashboard "Delete" button non-functional | **High** | `frontend/src/pages/Dashboard.tsx` | E2E test: click delete on dashboard → expect expense removed (will fail) |
| BUG-5 | Dashboard "Edit" redirects instead of editing | **Medium** | `frontend/src/pages/Dashboard.tsx` | E2E test: click edit on dashboard → expect edit modal (will fail) |
| BUG-6 | Date picker allows future dates | **Medium** | `frontend/src/components/ExpenseForm.tsx:116` | Component test: select future date → expect validation error (will fail) |
| BUG-7 | Date off-by-one (timezone bug) | **High** | `ExpenseForm.tsx:18`, `expenseService.ts:102` | E2E test: create expense for Feb 28 → verify Feb 28 displayed (will fail) |

### Potential Missing Features

| ID | Feature | Priority | Location | Notes |
|----|---------|----------|----------|-------|
| FEAT-1 | Search by category name | Low | `expenseService.ts:54-56` | Query joins categories but only searches description |

### Code Improvements

| ID | Improvement | Priority | Location |
|----|-------------|----------|----------|
| IMP-1 | Extract CSV parsing to separate module | Medium | `importService.ts` |
| IMP-2 | Add request ID for tracing | Medium | `backend/src/index.ts` |
| IMP-3 | Add API response types | Medium | `frontend/src/api/*.ts` |
| IMP-4 | Add error boundary | Medium | `frontend/src/App.tsx` |
| IMP-5 | Add loading skeletons | Low | Components |

### Tasks

#### 6.1 Fix SEC-1: JWT Secret
```typescript
// backend/src/middleware/auth.ts
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

const secret = JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';
```

#### 6.2 Fix SEC-2: Rate Limiting
```bash
npm install express-rate-limit
```
```typescript
// backend/src/routes/auth.ts
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many attempts, try again later' },
});

router.post('/login', authLimiter, async (req, res) => { ... });
router.post('/register', authLimiter, async (req, res) => { ... });
```

#### 6.3 Add Regression Tests
- Add test for SEC-1: verify error thrown without secret in prod mode
- Add test for SEC-2: verify rate limiting kicks in after 5 attempts
- Add test for BUG-1: document expected behavior

### Manual Testing Findings

| Task | Issue | Severity | Location |
|------|-------|----------|----------|
| #7 | Amount field accepts "e" (scientific notation) | Medium | `ExpenseForm.tsx` |
| #8 | Verify XSS protection on description | High | `ExpenseList.tsx`, backend |
| #9 | Remove demo credentials from login | Medium | `Login.tsx` |

### Deliverables
- [ ] Tests written for all security issues (SEC-1 through SEC-6)
- [ ] Tests written for all bugs (BUG-1 through BUG-7)
- [ ] Tests written for manual findings (#7, #8, #9)
- [ ] Test results documented (pass/fail for each)
- [ ] Failing tests prove bugs exist (ready for fix phase)

---

## Phase 7: Documentation & JSDoc

### Goals
- [ ] Add JSDoc to all exported service functions
- [ ] Create minimal, focused project documentation
- [ ] Remove temporary planning documents
- [ ] Ensure no document exceeds 200 lines

### Claude Code Prompt
```
Add JSDoc documentation and create project docs for an expense tracker app.

Project: Express + React + TypeScript + SQLite expense tracking application.
Goal: Minimal, focused documentation. No document sprawl.

JSDOC - Add to exported functions only. Keep concise (1-2 lines max):

backend/src/services/authService.ts:
/** Registers new user. Hashes password, returns user + JWT token. Throws on duplicate email. */
export async function register(email: string, password: string)

/** Authenticates user. Returns user + JWT token. Throws on invalid credentials. */
export async function login(email: string, password: string)

backend/src/services/expenseService.ts:
- listExpenses: "Returns paginated expenses for user. Supports date range and search filters."
- getExpense: "Returns single expense if owned by user, null otherwise."
- createExpense: "Creates expense for user. Returns created expense."
- updateExpense: "Updates expense if owned by user. Returns updated expense or null."
- deleteExpense: "Deletes expense if owned by user. Returns true if deleted."
- getMonthlyTotal: "Returns sum of expenses for given month/year."

backend/src/services/importService.ts (exported pure functions):
- detectDelimiter: "Detects CSV delimiter (comma, semicolon, tab) from content."
- parseCsvLine: "Parses single CSV line respecting quoted fields."
- parseDate: "Parses date string to YYYY-MM-DD. Supports ISO, US, EU formats."
- parseAmount: "Parses amount string removing currency symbols. Handles (negative) notation."
- validateRow: "Validates parsed row. Returns array of field errors."
- suggestMapping: "Suggests column mappings based on header keywords."

backend/src/middleware/auth.ts:
- authenticateToken: "Express middleware. Validates JWT, attaches user to req. Returns 401/403 on failure."
- generateToken: "Generates JWT with userId payload, 24h expiration."

frontend/src/hooks/*.ts:
- useAuth: "Auth context hook. Provides login, logout, register, user state."
- useExpenses: "TanStack Query hook for expense CRUD operations."
- useCategories: "TanStack Query hook for fetching categories."

DOCUMENTATION FILES:

1. Update README.md (keep under 150 lines):
   - Keep existing "Getting Started" section
   - Add "Project Structure" (backend/, frontend/, e2e/)
   - Add "Scripts" table (dev, build, test, test:coverage)
   - Add "Environment Variables" (JWT_SECRET, DATABASE_URL, etc.)

2. Create ARCHITECTURE.md (max 200 lines):
   ```
   [Browser] → [React SPA :5173] → [Express API :3002] → [SQLite DB]
   ```
   - Backend: Express, Knex query builder, better-sqlite3, JWT auth, Zod validation
   - Frontend: React 18, Vite, TanStack Query, React Router, Tailwind CSS
   - API Endpoints table (method, path, description)
   - Key decisions: Why SQLite, Why Knex, Why TanStack Query

3. Create TESTING.md (max 150 lines):
   - Strategy: Unit → Integration → E2E pyramid
   - Coverage targets: Backend 100%, Frontend 70%, E2E critical paths
   - Commands: npm test, npm test -- --coverage, npx playwright test
   - File organization: backend/tests/{unit,integration}, frontend/tests/, e2e/
   - Adding tests: Follow existing patterns, use test helpers

CLEANUP - Delete temporary planning files:
- TESTING_PLAN.md
- TESTING_IMPLEMENTATION_GUIDE.md
- RECORDING_CHEATSHEET.md

Final state: README.md, ARCHITECTURE.md, TESTING.md (3 docs only).
```

### Documentation Principles

> **Anti-pattern**: Document sprawl - excessive documentation is as detrimental as no documentation.
> **Target**: 3 essential documents that provide real value.

### Tasks

#### 7.1 JSDoc Coverage

**Backend Services** (exported functions only):
- `authService.ts`: `register()`, `login()`
- `expenseService.ts`: All CRUD functions, `getMonthlyTotal()`
- `importService.ts`: All exported functions (pure + database)

**Backend Middleware**:
- `auth.ts`: `authenticateToken()`, `generateToken()`

**Frontend Hooks**:
- `useAuth.ts`, `useExpenses.ts`, `useImport.ts`

**Frontend Components** (complex props only):
- `ExpenseForm.tsx`, `ImportWizard.tsx`

**JSDoc Style**:
```typescript
/**
 * Parses date string to YYYY-MM-DD format.
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, YYYY/MM/DD
 * @returns Normalized date string or null if invalid
 */
export function parseDate(dateStr: string): string | null
```

#### 7.2 Project Documentation

**File: `README.md`** (enhance existing, max 150 lines)
- Getting started (exists)
- Project structure overview
- Available npm scripts
- Environment variables

**File: `ARCHITECTURE.md`** (create, max 200 lines)
- System overview diagram (ASCII)
- Backend stack: Express + Knex + SQLite
- Frontend stack: React + TanStack Query
- Data flow diagrams (auth, expenses, import)
- API endpoints summary
- Key design decisions

**File: `TESTING.md`** (create, max 150 lines)
- Test strategy overview
- Coverage targets by layer
- How to run tests (commands)
- Test file organization
- Writing new tests guide

#### 7.3 Cleanup Temporary Documents

**Delete after implementation complete**:
- `TESTING_PLAN.md` → Merge essentials into `TESTING.md`
- `TESTING_IMPLEMENTATION_GUIDE.md` → Implementation complete
- `RECORDING_CHEATSHEET.md` → Interview-specific

### Deliverables
- [ ] JSDoc on all exported service functions
- [ ] JSDoc on complex component props
- [ ] `README.md` enhanced
- [ ] `ARCHITECTURE.md` created (≤200 lines)
- [ ] `TESTING.md` created (≤150 lines)
- [ ] Temporary planning docs removed
- [ ] No document exceeds line limits

---

## Coverage Targets Summary

| Layer | Target | Metric |
|-------|--------|--------|
| Backend Services | 100% | Line coverage |
| Backend Routes | 100% | Line coverage |
| Backend Middleware | 100% | Line coverage |
| Frontend Components | 70% | Line coverage |
| Frontend Hooks | 60% | Line coverage |
| E2E Critical Paths | 100% | User journeys |

---

## Test Commands

```bash
# Run all backend tests
cd backend && npm test

# Run backend tests with coverage
cd backend && npm test -- --coverage

# Run frontend tests
cd frontend && npm test

# Run frontend tests with coverage
cd frontend && npm test -- --coverage

# Run E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui

# Generate E2E test code
npx playwright codegen localhost:5173

# View E2E report
npx playwright show-report
```

---

## Definition of Done

### For Each Test File
- [ ] All tests pass
- [ ] No skipped tests (`.skip`)
- [ ] Coverage target met
- [ ] Edge cases covered
- [ ] Error paths tested

### For Each Phase
- [ ] All tasks completed
- [ ] Tests committed to repo
- [ ] Coverage report generated
- [ ] Documentation updated

### For Project Completion
- [ ] All phases complete (1-7)
- [ ] Total coverage > 75%
- [ ] E2E tests pass in CI
- [ ] Security issues addressed
- [ ] Documentation finalized (3 files max)
- [ ] Temporary docs removed
- [ ] PR ready for review

---

## Appendix: File Checklist

### Backend Tests
- [ ] `tests/helpers/testDb.ts`
- [ ] `tests/helpers/testApp.ts`
- [ ] `tests/helpers/fixtures.ts`
- [ ] `tests/unit/services/importService.test.ts`
- [ ] `tests/unit/services/authService.test.ts`
- [ ] `tests/unit/services/expenseService.test.ts`
- [ ] `tests/unit/middleware/auth.test.ts`
- [ ] `tests/integration/auth.routes.test.ts`
- [ ] `tests/integration/expenses.routes.test.ts`
- [ ] `tests/integration/import.routes.test.ts`
- [ ] `tests/integration/categories.routes.test.ts`

### Frontend Tests
- [ ] `tests/mocks/handlers.ts`
- [ ] `tests/mocks/server.ts`
- [ ] `tests/setup.ts`
- [ ] `tests/components/ExpenseForm.test.tsx`
- [ ] `tests/components/ExpenseList.test.tsx`
- [ ] `tests/components/ImportWizard.test.tsx`
- [ ] `tests/pages/Login.test.tsx`
- [ ] `tests/pages/Dashboard.test.tsx`

### E2E Tests
- [ ] `e2e/playwright.config.ts`
- [ ] `e2e/page-objects/LoginPage.ts`
- [ ] `e2e/page-objects/DashboardPage.ts`
- [ ] `e2e/page-objects/ExpensesPage.ts`
- [ ] `e2e/page-objects/ImportPage.ts`
- [ ] `e2e/tests/auth.spec.ts`
- [ ] `e2e/tests/expenses.spec.ts`
- [ ] `e2e/tests/import.spec.ts`
- [ ] `e2e/tests/dashboard.spec.ts`

### Documentation (Phase 7)
- [ ] `README.md` (enhanced)
- [ ] `ARCHITECTURE.md` (created)
- [ ] `TESTING.md` (created)
- [ ] JSDoc in `backend/src/services/*.ts`
- [ ] JSDoc in `backend/src/middleware/auth.ts`
- [ ] JSDoc in `frontend/src/hooks/*.ts`
- [ ] JSDoc in `frontend/src/components/ExpenseForm.tsx`
- [ ] JSDoc in `frontend/src/components/ImportWizard.tsx`

### Pre-commit Hooks (Phase 1)
- [ ] `.husky/pre-commit`
- [ ] `package.json` (root) - lint-staged config
- [ ] Husky installed and initialized

### Cleanup (Phase 7)
- [ ] `TESTING_PLAN.md` (removed)
- [ ] `TESTING_IMPLEMENTATION_GUIDE.md` (removed)
- [ ] `RECORDING_CHEATSHEET.md` (removed)
