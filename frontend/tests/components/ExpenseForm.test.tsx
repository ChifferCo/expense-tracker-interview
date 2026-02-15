/**
 * @fileoverview Unit tests for ExpenseForm component
 *
 * Tests the ExpenseForm component in both create and edit modes.
 * All tests follow the AAA (Arrange-Act-Assert) pattern using React Testing Library.
 *
 * ## Test Coverage (11 tests)
 *
 * ### Create Mode
 * - Renders empty form fields
 * - Calls onSubmit with form data
 * - Calls onCancel when cancel button clicked
 *
 * ### Edit Mode
 * - Pre-fills form with existing expense data
 * - Shows "Update" button instead of "Create"
 *
 * ### Validation
 * - Empty amount shows error
 * - Zero amount shows error
 * - Empty description shows error
 * - Empty date shows error
 *
 * ### Loading State
 * - Disables submit button and shows "Saving..."
 *
 * ### Category Selection
 * - Renders category dropdown with options
 * - Updates categoryId when selection changes
 *
 * ## Testing Utilities
 * - Uses QueryClientProvider wrapper for React Query
 * - Uses userEvent for realistic user interactions
 * - Uses MSW for API mocking (categories endpoint)
 *
 * @see src/components/ExpenseForm.tsx - Component under test
 * @see tests/mocks/handlers.ts - MSW handlers for API mocking
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

  describe('BUG-001: Amount Field Accepts "e" Character', () => {
    /**
     * BUG: The amount input field accepts the "e" character because HTML number
     * inputs allow scientific notation (e.g., 1e5 = 100000). This can lead to
     * confusion or invalid data entry.
     *
     * Expected: Amount field should only accept numeric digits and decimal point
     * Actual: Amount field accepts "e" character for scientific notation
     *
     * These tests FAIL until the bug is fixed.
     */
    it('should reject "e" character in amount field', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      // Act - type scientific notation
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '1e2');

      // Assert - "e" should NOT be accepted in amount field
      const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
      expect(amountInput.value).not.toContain('e');
    });

    it('should not submit with scientific notation amount', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      // Act - try to submit with scientific notation
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '1e2');
      await user.type(screen.getByLabelText('Description'), 'Scientific notation test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - should show validation error, not submit
      expect(screen.getByText('Invalid amount')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Date Selection', () => {
    /**
     * Date selection tests - verifies past, present, and future dates are accepted.
     * Future dates are valid for scheduled/planned expenses.
     */
    it('should allow future dates for scheduled expenses', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
      });

      // Calculate a future date (1 month from now)
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Act - enter future date
      await user.type(screen.getByLabelText('Amount'), '50');
      await user.type(screen.getByLabelText('Description'), 'Scheduled expense');
      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Date'), futureDateStr);
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - future dates should be accepted
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: futureDateStr })
      );
    });

    it('should allow today date', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
      });

      const today = new Date().toISOString().split('T')[0];

      // Act - enter today's date
      await user.type(screen.getByLabelText('Amount'), '50');
      await user.type(screen.getByLabelText('Description'), 'Today expense test');
      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Date'), today);
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - today should be accepted
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should allow past dates', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
      });

      // Act - enter past date
      await user.type(screen.getByLabelText('Amount'), '50');
      await user.type(screen.getByLabelText('Description'), 'Past expense test');
      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Date'), '2024-01-15');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - past dates should be accepted
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2024-01-15' })
      );
    });
  });

  describe('BUG-005: Amount Decimal Precision', () => {
    /**
     * BUG: The amount field accepts more than 2 decimal places, but displays
     * rounded values while storing the full precision. This causes a mismatch
     * between what users see and what's stored in the database.
     *
     * Example: User enters 3.145, sees 3.15 displayed, but 3.145 is stored.
     *
     * Expected: Amount should only allow 2 decimal places and save exactly as entered
     * Actual: Accepts arbitrary decimal places, displays rounded, stores full value
     *
     * This test FAILS until the bug is fixed.
     */
    it('should reject amount with more than 2 decimal places', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      // Act - enter amount with 3 decimal places
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '3.144');
      await user.type(screen.getByLabelText('Description'), 'Decimal precision test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - should show validation error for invalid decimal precision
      expect(screen.getByText(/2 decimal places|invalid amount/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should save amount exactly as entered with 2 decimal places', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      // Act - enter valid amount with 2 decimal places
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '3.14');
      await user.type(screen.getByLabelText('Description'), 'Valid decimal test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - should submit with exact value (not rounded)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3.14 })
      );
    });

    it('should not round amount values on submission', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <ExpenseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      });

      // Act - enter amount that would round up (3.145 -> 3.15)
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '3.145');
      await user.type(screen.getByLabelText('Description'), 'Rounding test');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Assert - should NOT submit with rounded value
      // If this passes with 3.15, it means rounding is occurring
      expect(mockOnSubmit).not.toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3.15 })
      );
    });
  });
});
