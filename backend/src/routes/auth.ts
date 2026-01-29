import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const result = await authService.register({ email, password });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message === 'Email already registered') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message === 'Invalid email or password') {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
