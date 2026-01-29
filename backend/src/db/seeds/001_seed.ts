import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex('expenses').del();
  await knex('users').del();
  await knex('categories').del();

  // Insert categories
  await knex('categories').insert([
    { id: 1, name: 'Food', icon: 'utensils' },
    { id: 2, name: 'Transport', icon: 'car' },
    { id: 3, name: 'Entertainment', icon: 'film' },
    { id: 4, name: 'Bills', icon: 'file-text' },
    { id: 5, name: 'Shopping', icon: 'shopping-bag' },
    { id: 6, name: 'Other', icon: 'more-horizontal' },
  ]);

  // Insert demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  await knex('users').insert([
    { id: 1, email: 'demo@example.com', passwordHash },
  ]);

  // Insert sample expenses
  const today = new Date();
  const expenses = [];

  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    expenses.push({
      userId: 1,
      categoryId: (i % 6) + 1,
      amount: Math.floor(Math.random() * 150) + 10,
      description: getSampleDescription((i % 6) + 1),
      date: date.toISOString().split('T')[0],
    });
  }

  await knex('expenses').insert(expenses);
}

function getSampleDescription(categoryId: number): string {
  const descriptions: Record<number, string[]> = {
    1: ['Lunch at cafe', 'Grocery shopping', 'Coffee', 'Dinner with friends'],
    2: ['Uber ride', 'Gas station', 'Bus ticket', 'Parking fee'],
    3: ['Movie tickets', 'Netflix subscription', 'Concert', 'Video game'],
    4: ['Electricity bill', 'Internet bill', 'Phone bill', 'Water bill'],
    5: ['New shoes', 'Books', 'Electronics', 'Clothes'],
    6: ['Gift for friend', 'Charity donation', 'Miscellaneous', 'Other expense'],
  };

  const options = descriptions[categoryId] || descriptions[6];
  return options[Math.floor(Math.random() * options.length)];
}
