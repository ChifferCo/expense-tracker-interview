import { apiRequest } from './client';
import type { ReceiptAnalysisResult, EmailData, ScanEmailsResult } from '../types';

export async function analyzeEmailReceipt(emailContent: string): Promise<ReceiptAnalysisResult> {
  return apiRequest<ReceiptAnalysisResult>('/receipts/analyze', {
    method: 'POST',
    body: JSON.stringify({ emailContent }),
  });
}

export async function analyzePdfReceipt(file: File): Promise<ReceiptAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/receipts/analyze-pdf', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Failed to analyze PDF');
  }

  return response.json();
}

export async function scanEmails(emails: EmailData[]): Promise<ScanEmailsResult> {
  return apiRequest<ScanEmailsResult>('/receipts/scan-emails', {
    method: 'POST',
    body: JSON.stringify({ emails }),
  });
}
