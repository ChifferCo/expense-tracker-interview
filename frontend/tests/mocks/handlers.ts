import { http, HttpResponse } from 'msw';

// Use wildcard to match both relative and absolute URLs
const API_URL = '*/api';

// Mock data
const mockUser = { id: 1, email: 'test@example.com' };
const mockToken = 'mock-jwt-token';

const mockCategories = [
  { id: 1, name: 'Food', icon: '🍔' },
  { id: 2, name: 'Transport', icon: '🚗' },
  { id: 3, name: 'Entertainment', icon: '🎬' },
  { id: 4, name: 'Shopping', icon: '🛍️' },
  { id: 5, name: 'Bills', icon: '📄' },
  { id: 6, name: 'Other', icon: '📦' },
];

const mockExpenses = [
  {
    id: 1,
    userId: 1,
    categoryId: 1,
    amount: 50.00,
    description: 'Groceries',
    date: '2026-02-15',
    createdAt: '2026-02-15T10:00:00Z',
    categoryName: 'Food',
    categoryIcon: '🍔',
  },
  {
    id: 2,
    userId: 1,
    categoryId: 2,
    amount: 25.00,
    description: 'Uber ride',
    date: '2026-02-14',
    createdAt: '2026-02-14T10:00:00Z',
    categoryName: 'Transport',
    categoryIcon: '🚗',
  },
];

export const handlers = [
  // Auth routes
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ user: mockUser, token: mockToken });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'existing@example.com') {
      return HttpResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return HttpResponse.json({ user: { id: 2, email: body.email }, token: mockToken }, { status: 201 });
  }),

  // Categories
  http.get(`${API_URL}/categories`, () => {
    return HttpResponse.json(mockCategories);
  }),

  // Expenses
  http.get(`${API_URL}/expenses`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    let filtered = [...mockExpenses];
    if (search) {
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json(filtered);
  }),

  http.get(`${API_URL}/expenses/:id`, ({ params }) => {
    const expense = mockExpenses.find(e => e.id === Number(params.id));
    if (!expense) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(expense);
  }),

  http.post(`${API_URL}/expenses`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newExpense = {
      id: 3,
      userId: 1,
      ...body,
      createdAt: new Date().toISOString(),
      categoryName: 'Food',
      categoryIcon: '🍔',
    };
    return HttpResponse.json(newExpense, { status: 201 });
  }),

  http.put(`${API_URL}/expenses/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const expense = mockExpenses.find(e => e.id === Number(params.id));
    if (!expense) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ ...expense, ...body });
  }),

  http.delete(`${API_URL}/expenses/:id`, ({ params }) => {
    const expense = mockExpenses.find(e => e.id === Number(params.id));
    if (!expense) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_URL}/expenses/monthly-total`, ({ request }) => {
    const url = new URL(request.url);
    const year = Number(url.searchParams.get('year')) || 2026;
    const month = Number(url.searchParams.get('month')) || 2;
    return HttpResponse.json({ total: 75.00, year, month });
  }),

  // Import routes
  http.get(`${API_URL}/import/session`, () => {
    return HttpResponse.json(null, { status: 404 });
  }),

  http.post(`${API_URL}/import/session`, () => {
    return HttpResponse.json({
      session: { id: 1, status: 'upload' },
    }, { status: 201 });
  }),

  http.get(`${API_URL}/import/history`, () => {
    return HttpResponse.json([]);
  }),
];

export { mockUser, mockToken, mockCategories, mockExpenses };
