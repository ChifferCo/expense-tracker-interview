// setup.js - Cross-platform setup script for the Expense Tracker project
// Usage: node setup.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function log(message) {
  console.log(message);
}

function run(command, cwd = ROOT_DIR) {
  log(`  Running: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit', shell: true });
    return true;
  } catch (error) {
    return false;
  }
}

function getNodeMajorVersion() {
  const version = process.version;
  return parseInt(version.slice(1).split('.')[0], 10);
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function promptContinue(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  log('========================================');
  log('Expense Tracker - Project Setup');
  log('========================================');
  log('');

  // Check Node.js version
  const nodeVersion = getNodeMajorVersion();
  log(`Detected Node.js version: ${process.version}`);
  log(`Platform: ${process.platform} (${process.arch})`);

  if (nodeVersion >= 24) {
    log('');
    log('⚠️  WARNING: Node.js v24+ detected!');
    log('   This project uses better-sqlite3 which may not have prebuilt binaries for Node 24.');
    log('   Recommended: Use Node.js 18, 20, or 22 (LTS versions)');
    log('');
    log('   To switch Node versions:');
    log('   - nvm (macOS/Linux): nvm use 20');
    log('   - nvm-windows: nvm use 20');
    log('   - n (macOS/Linux): n 20');
    log('');

    const shouldContinue = await promptContinue('Continue anyway? (y/N) ');
    if (!shouldContinue) {
      log('Setup cancelled.');
      process.exit(1);
    }
  }

  log('');
  log('Step 1/5: Installing root dependencies...');
  if (!run('npm install')) {
    log('❌ Failed to install root dependencies');
    process.exit(1);
  }

  log('');
  log('Step 2/5: Installing backend dependencies...');
  // Clean install to avoid platform-specific issues
  removeDir(path.join(BACKEND_DIR, 'node_modules'));
  removeFile(path.join(BACKEND_DIR, 'package-lock.json'));
  if (!run('npm install', BACKEND_DIR)) {
    log('❌ Failed to install backend dependencies');
    process.exit(1);
  }

  log('');
  log('Step 3/5: Installing frontend dependencies...');
  // Clean install to avoid platform-specific issues (especially rollup on ARM64)
  removeDir(path.join(FRONTEND_DIR, 'node_modules'));
  removeFile(path.join(FRONTEND_DIR, 'package-lock.json'));
  if (!run('npm install', FRONTEND_DIR)) {
    log('❌ Failed to install frontend dependencies');
    process.exit(1);
  }

  log('');
  log('Step 4/5: Setting up development database...');
  if (!run('npm run db:migrate', BACKEND_DIR)) {
    log('❌ Failed to run database migrations');
    process.exit(1);
  }
  if (!run('npm run db:seed', BACKEND_DIR)) {
    log('❌ Failed to seed database');
    process.exit(1);
  }

  log('');
  log('Step 5/5: Installing Playwright browsers...');
  run('npx playwright install chromium');

  log('');
  log('========================================');
  log('✅ Setup Complete!');
  log('========================================');
  log('');
  log('To start the application:');
  log('  Terminal 1: cd backend && npm run dev');
  log('  Terminal 2: cd frontend && npm run dev');
  log('');
  log('Then open: http://localhost:5173');
  log('Login: demo@example.com / password123');
  log('');
  log('To run E2E tests:');
  log('  npm run test:e2e');
  log('');
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
