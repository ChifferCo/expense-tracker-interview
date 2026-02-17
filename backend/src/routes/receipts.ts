import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  analyzeEmailForReceipt,
  analyzePdfForReceipt,
  filterReceiptEmails,
  extractExpensesFromEmails,
  type Email,
} from '../services/llmService.js';
import db from '../db/knex.js';
import logger from '../logger.js';

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Schema for email content analysis
const analyzeEmailSchema = z.object({
  emailContent: z.string().min(1).max(50000),
});

// Schema for email data in scan-emails endpoint
const emailSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string(),
  date: z.string(),
  body: z.string(),
});

const scanEmailsSchema = z.object({
  emails: z.array(emailSchema).min(1).max(100),
});

// Helper function to match category name to database category
async function matchCategory(categoryName: string): Promise<{ id: number; name: string }> {
  const categories = await db('categories').select('id', 'name');
  const normalizedName = categoryName.toLowerCase();

  // Try exact match first
  const exactMatch = categories.find((c) => c.name.toLowerCase() === normalizedName);
  if (exactMatch) {
    return { id: exactMatch.id, name: exactMatch.name };
  }

  // Try partial match
  const partialMatch = categories.find(
    (c) => c.name.toLowerCase().includes(normalizedName) || normalizedName.includes(c.name.toLowerCase())
  );
  if (partialMatch) {
    return { id: partialMatch.id, name: partialMatch.name };
  }

  // Default to "Other" category
  const otherCategory = categories.find((c) => c.name.toLowerCase() === 'other');
  if (otherCategory) {
    return { id: otherCategory.id, name: otherCategory.name };
  }

  // Fallback to first category if "Other" doesn't exist
  return { id: categories[0].id, name: categories[0].name };
}

// POST /api/receipts/analyze - Analyze email content for receipt data
router.post('/analyze', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailContent } = analyzeEmailSchema.parse(req.body);

    const result = await analyzeEmailForReceipt(emailContent);

    if (!result.success || !result.data) {
      res.status(400).json({ error: result.error || 'Failed to analyze email' });
      return;
    }

    // Match the suggested category to a database category
    const category = await matchCategory(result.data.category);

    res.json({
      ...result.data,
      categoryId: category.id,
      categoryName: category.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    logger.error({ err: error }, 'Error analyzing email');
    res.status(500).json({ error: 'Failed to analyze email' });
  }
});

// POST /api/receipts/analyze-pdf - Analyze PDF receipt
router.post(
  '/analyze-pdf',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const result = await analyzePdfForReceipt(req.file.buffer);

      if (!result.success || !result.data) {
        res.status(400).json({ error: result.error || 'Failed to analyze PDF' });
        return;
      }

      // Match the suggested category to a database category
      const category = await matchCategory(result.data.category);

      res.json({
        ...result.data,
        categoryId: category.id,
        categoryName: category.name,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error analyzing PDF');
      res.status(500).json({ error: 'Failed to analyze PDF' });
    }
  }
);

// POST /api/receipts/scan-emails - Scan uploaded email data for receipts
router.post('/scan-emails', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { emails } = scanEmailsSchema.parse(req.body);

    logger.info({ emailCount: emails.length }, 'Starting email scan');

    // Step 1: Filter emails to find receipt-containing ones
    const filterResult = await filterReceiptEmails(emails as Email[]);

    if (filterResult.receiptEmailIds.length === 0) {
      res.json({ expenses: [], message: 'No receipt emails found' });
      return;
    }

    // Step 2: Extract expense data from receipt emails
    const receiptEmails = emails.filter((e) => filterResult.receiptEmailIds.includes(e.id));
    const extractedExpenses = await extractExpensesFromEmails(receiptEmails as Email[]);

    // Step 3: Match categories and prepare draft expenses
    const draftExpenses = await Promise.all(
      extractedExpenses.map(async (expense) => {
        const category = await matchCategory(expense.category);
        return {
          emailId: expense.emailId,
          merchant: expense.merchant,
          amount: expense.amount,
          date: expense.date,
          description: expense.description,
          categoryId: category.id,
          categoryName: category.name,
        };
      })
    );

    logger.info(
      {
        totalEmails: emails.length,
        receiptEmails: receiptEmails.length,
        extractedExpenses: draftExpenses.length,
      },
      'Email scan completed'
    );

    res.json({ expenses: draftExpenses });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid email data', details: error.errors });
      return;
    }
    logger.error({ err: error }, 'Error scanning emails');
    res.status(500).json({ error: 'Failed to scan emails' });
  }
});

export default router;
