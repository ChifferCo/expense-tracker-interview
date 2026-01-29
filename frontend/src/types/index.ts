export interface User {
  id: number;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: number;
  userId: number;
  categoryId: number;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  categoryName: string;
  categoryIcon: string;
}

export interface CreateExpenseData {
  categoryId: number;
  amount: number;
  description: string;
  date: string;
}

export interface UpdateExpenseData {
  categoryId?: number;
  amount?: number;
  description?: string;
  date?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MonthlyTotal {
  total: number;
  year: number;
  month: number;
}
