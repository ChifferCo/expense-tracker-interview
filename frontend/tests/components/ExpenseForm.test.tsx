/**
 * @fileoverview Unit tests for ExpenseForm component
 * Tests create/edit modes, validation, loading states, and category selection
 *
 * @see src/components/ExpenseForm.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseForm } from '../../src/components/ExpenseForm';
import type { Expense } from '../../src/types';

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ExpenseForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render create form with empty fields', async () => {
      // Arrange & Act
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
      });
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });

    it('should call onSubmit with form data', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
      });

      // Act
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '50.00');
      await user.type(screen.getByLabelText('Description'), 'Test expense');
      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(mockOnSubmit).toHaveBeenCalledWith({
        categoryId: 1,
        amount: 50,
        description: 'Test expense',
        date: '2024-01-15',
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });

      // Act
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Assert
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const mockExpense: Expense = {
      id: 1,
      userId: 1,
      categoryId: 2,
      amount: 100,
      description: 'Existing expense',
      date: '2024-02-01',
      createdAt: '2024-02-01T10:00:00Z',
      categoryName: 'Transport',
      categoryIcon: '🚗',
    };

    it('should render edit form with pre-filled data', async () => {
      // Arrange & Act
      render(
        <ExpenseForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={mockExpense}
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toHaveValue(100);
      });
      expect(screen.getByLabelText('Description')).toHaveValue('Existing expense');
      expect(screen.getByLabelText('Date')).toHaveValue('2024-02-01');
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for empty amount', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });

      // Act - clear amount and submit
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Description'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });

      // Act
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '0');
      await user.type(screen.getByLabelText('Description'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty description', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });

      // Act
      await user.type(screen.getByLabelText('Amount'), '50');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty date', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
      });

      // Act
      await user.type(screen.getByLabelText('Amount'), '50');
      await user.type(screen.getByLabelText('Description'), 'Test');
      await user.clear(screen.getByLabelText('Date'));
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(screen.getByText('Date is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when loading', async () => {
      // Arrange & Act
      render(
        <ExpenseForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });
  });

  describe('Category Selection', () => {
    it('should render category select with options', async () => {
      // Arrange & Act
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
      });
      const select = screen.getByLabelText('Category');
      expect(select).toBeInstanceOf(HTMLSelectElement);
    });

    it('should update category when selection changes', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      // Wait for categories to load (options appear)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Transport' })).toBeInTheDocument();
      });

      // Act - change category and submit with valid data
      await user.selectOptions(screen.getByLabelText('Category'), '2');
      await user.type(screen.getByLabelText('Amount'), '25');
      await user.type(screen.getByLabelText('Description'), 'Category test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 2 })
      );
    });
  });
});
