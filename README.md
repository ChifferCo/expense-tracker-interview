# Expense Tracker - Interview Exercise

A simple expense tracking application built with React, TypeScript, Node.js, and SQLite.

<img width="1058" height="635" alt="image" src="https://github.com/user-attachments/assets/74719286-c2ba-4d6a-91a7-21920cd9021a" />

## Quick Start

### Automated Setup (Recommended)

```bash
node setup.js
```

This cross-platform script will:
1. Check Node.js version compatibility
2. Install all dependencies (root, backend, frontend)
3. Run database migrations and seed data
4. Install Playwright browsers for E2E testing

### Manual Setup

<details>
<summary><strong>macOS / Linux</strong></summary>

```bash
npm install
cd backend && npm install && npm run db:migrate && npm run db:seed && cd ..
cd frontend && npm install && cd ..
npx playwright install chromium
```
</details>

<details>
<summary><strong>Windows (PowerShell)</strong></summary>

```powershell
npm install
cd backend; npm install; npm run db:migrate; npm run db:seed; cd ..
cd frontend; npm install; cd ..
npx playwright install chromium
```
</details>

### Running the Application

Start both servers in separate terminals:

| Terminal | Command | URL |
|----------|---------|-----|
| Backend  | `cd backend && npm run dev` | http://localhost:3002 |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 |

**Login:** `demo@example.com` / `password123`

## Project Structure

```
expense-tracker-interview/
├── backend/          # Node.js + Express + Knex API
├── frontend/         # React + Vite + TanStack Query
├── e2e/              # Playwright E2E tests
└── README.md
```

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18, 20, or 22 (LTS) | ⚠️ Node 24+ has native module compatibility issues |
| npm | 9+ | Comes with Node.js |

#### Node Version Management

| OS | Tool | Install recommended version |
|----|------|----------------------------|
| macOS/Linux | [nvm](https://github.com/nvm-sh/nvm) | `nvm install 20 && nvm use 20` |
| Windows | [nvm-windows](https://github.com/coreybutler/nvm-windows) | `nvm install 20 && nvm use 20` |

> 💡 This project includes an `.nvmrc` file. Run `nvm use` to automatically switch to the correct version.

### Backend Setup

```bash
cd backend
npm install
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed with sample data
npm run dev           # Start dev server on http://localhost:3002
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start dev server on http://localhost:5173
```

### Test Accounts

After seeding, you can login with:
- Email: `demo@example.com`
- Password: `password123`

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Knex.js (query builder)
- SQLite (database)
- JWT (authentication)

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query (data fetching)
- Tailwind CSS (styling)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Expenses
- `GET /api/expenses` - List user's expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - List all categories

## E2E Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Run with UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

E2E tests use a separate `test.db` database that is automatically reset before each run.

## Troubleshooting

### `better-sqlite3` fails to install

This usually happens with Node.js 24+. The native module doesn't have prebuilt binaries yet.

**Solution:** Use Node.js 18, 20, or 22 (LTS versions)
```bash
nvm install 20
nvm use 20
```

### `@rollup/rollup-darwin-arm64` not found (macOS)

This is an npm bug with optional dependencies on Apple Silicon Macs.

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Port already in use

**macOS/Linux:**
```bash
lsof -i :3002          # Check backend port
lsof -i :5173          # Check frontend port
kill -9 <PID>          # Kill the process
```

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3002    # Check backend port
netstat -ano | findstr :5173    # Check frontend port
taskkill /PID <PID> /F          # Kill the process
```

### Database issues

**macOS/Linux:**
```bash
cd backend
rm -f data.db        # Delete dev database
rm -f test.db        # Delete test database
npm run db:migrate   # Recreate schema
npm run db:seed      # Re-seed data
```

**Windows (PowerShell):**
```powershell
cd backend
Remove-Item data.db -ErrorAction SilentlyContinue   # Delete dev database
Remove-Item test.db -ErrorAction SilentlyContinue   # Delete test database
npm run db:migrate   # Recreate schema
npm run db:seed      # Re-seed data
```
