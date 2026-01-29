import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import * as expenseService from '../services/expenseService.js';
import type { JwtPayload } from '../types/index.js';

const router = Router();

type AuthRequest = Request & { user: JwtPayload };

const createExpenseSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  description: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateExpenseSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const { limit, offset, startDate, endDate } = req.query;

    const expenses = await expenseService.listExpenses({
      userId: user.userId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.json(expenses);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/monthly-total', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const total = await expenseService.getMonthlyTotal(user.userId, year, month);
    res.json({ total, year, month });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const id = Number(req.params.id);

    const expense = await expenseService.getExpense(id, user.userId);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(expense);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const data = createExpenseSchema.parse(req.body);

    const expense = await expenseService.createExpense({
      userId: user.userId,
      ...data,
    });

    res.status(201).json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const id = Number(req.params.id);
    const data = updateExpenseSchema.parse(req.body);

    const expense = await expenseService.updateExpense(id, user.userId, data);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthRequest;
    const id = Number(req.params.id);

    const deleted = await expenseService.deleteExpense(id, user.userId);
    if (!deleted) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
