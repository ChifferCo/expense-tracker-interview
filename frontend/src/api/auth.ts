import { apiRequest } from './client';
import type { AuthResponse } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('token', response.token);
  return response;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('token', response.token);
  return response;
}

export function logout(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}
