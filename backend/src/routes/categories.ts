import { Router, Request, Response } from 'express';
import db from '../db/knex.js';
import type { Category } from '../types/index.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await db('categories').select<Category[]>('*');
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
