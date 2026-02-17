import { useMutation } from '@tanstack/react-query';
import * as receiptsApi from '../api/receipts';
import type { EmailData } from '../types';

export function useAnalyzeEmail() {
  return useMutation({
    mutationFn: (emailContent: string) => receiptsApi.analyzeEmailReceipt(emailContent),
  });
}

export function useAnalyzePdf() {
  return useMutation({
    mutationFn: (file: File) => receiptsApi.analyzePdfReceipt(file),
  });
}

export function useScanEmails() {
  return useMutation({
    mutationFn: (emails: EmailData[]) => receiptsApi.scanEmails(emails),
  });
}
