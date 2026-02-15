import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import expenseRoutes from '../../src/routes/expenses.js';
import categoryRoutes from '../../src/routes/categories.js';
import importRoutes from '../../src/routes/import.js';

export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Simplified request logging for tests (optional, can be removed)
  app.use((req: Request, res: Response, next: NextFunction) => {
    next();
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/import', importRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

export default createTestApp;
