import { useState } from 'react';
import { useExpenses, useMonthlyTotal, useUpdateExpense, useDeleteExpense } from '../hooks/useExpenses';
import { ExpenseList } from '../components/ExpenseList';
import { ExpenseForm } from '../components/ExpenseForm';
import { Modal } from '../components/Modal';
import { DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import type { Expense, CreateExpenseData } from '../types';

export function Dashboard() {
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: monthlyTotal, isLoading: totalLoading } = useMonthlyTotal();

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { data: lastMonthTotal, isLoading: lastMonthLoading } = useMonthlyTotal(
    lastMonth.getFullYear(),
    lastMonth.getMonth() + 1
  );

  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const recentExpenses = expenses?.slice(0, 5) || [];
  const totalExpenses = expenses?.length || 0;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: CreateExpenseData) => {
    if (editingExpense) {
      updateExpense.mutate(
        { id: editingExpense.id, data },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingExpense(null);
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteExpense.mutate(deleteConfirmId, {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      });
    }
  };

  const currentTotal = monthlyTotal?.total || 0;
  const previousTotal = lastMonthTotal?.total || 0;
  const difference = currentTotal - previousTotal;
  const percentChange = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900" data-testid="dashboard-heading">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3" data-testid="dashboard-stats">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {monthName} Spending
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {totalLoading ? '...' : `$${monthlyTotal?.total.toFixed(2) || '0.00'}`}
                  </dd>
                  {!totalLoading && !lastMonthLoading && previousTotal > 0 && (
                    <dd className={`flex items-center text-sm ${difference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {difference >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(percentChange).toFixed(1)}% vs last month
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {expensesLoading ? '...' : totalExpenses}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg per Expense</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {expensesLoading || !expenses?.length
                      ? '$0.00'
                      : `$${(expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length).toFixed(2)}`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4" data-testid="dashboard-recent-expenses-heading">Recent Expenses</h2>
        {expensesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <ExpenseList
            expenses={recentExpenses}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        dataTestId={editingExpense ? 'modal-edit-expense' : 'modal-add-expense'}
      >
        <ExpenseForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingExpense(null);
          }}
          initialData={editingExpense || undefined}
          isLoading={updateExpense.isPending}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Expense"
        dataTestId="modal-delete-expense"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500" data-testid="modal-delete-expense-message">
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              data-testid="modal-delete-expense-cancel"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteExpense.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              data-testid="modal-delete-expense-confirm"
            >
              {deleteExpense.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
