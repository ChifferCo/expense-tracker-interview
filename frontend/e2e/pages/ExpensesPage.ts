import type { Page } from '@playwright/test';
import { AppLayout } from './AppLayout.js';

export interface ExpenseFormData {
  amount: number | string;
  description: string;
  date?: string;
}

export class ExpensesPage {
  readonly layout: AppLayout;

  constructor(private readonly page: Page) {
    this.layout = new AppLayout(page);
  }

  get heading() {
    return this.page.getByTestId('expenses-heading');
  }

  get addExpenseButton() {
    return this.page.getByTestId('expenses-add-button');
  }

  get searchInput() {
    return this.page.getByTestId('expenses-search');
  }

  get dateRangeLabel() {
    return this.page.getByTestId('expenses-date-range');
  }

  get filterAllTime() {
    return this.page.getByTestId('expenses-filter-all');
  }

  get filterThisMonth() {
    return this.page.getByTestId('expenses-filter-this-month');
  }

  get filterLastMonth() {
    return this.page.getByTestId('expenses-filter-last-month');
  }

  get filterLast12Months() {
    return this.page.getByTestId('expenses-filter-last-12-months');
  }

  get filterCustom() {
    return this.page.getByTestId('expenses-filter-custom');
  }

  get customStartDateLabel() {
    return this.page.getByTestId('expenses-custom-start-label');
  }

  get customEndDateLabel() {
    return this.page.getByTestId('expenses-custom-end-label');
  }

  // Modal: Add / Edit expense
  get modalAddExpenseHeading() {
    return this.page.getByTestId('modal-add-expense-title');
  }

  get modalEditExpenseHeading() {
    return this.page.getByTestId('modal-edit-expense-title');
  }

  get modalDeleteHeading() {
    return this.page.getByTestId('modal-delete-expense-title');
  }

  get formCategory() {
    return this.page.getByTestId('expense-form-category');
  }

  get formAmount() {
    return this.page.getByTestId('expense-form-amount');
  }

  get formDescription() {
    return this.page.getByTestId('expense-form-description');
  }

  get formDate() {
    return this.page.getByTestId('expense-form-date');
  }

  get formCancelButton() {
    return this.page.getByTestId('expense-form-cancel');
  }

  get formCreateButton() {
    return this.page.getByTestId('expense-form-create');
  }

  get formUpdateButton() {
    return this.page.getByTestId('expense-form-update');
  }

  get deleteConfirmButton() {
    return this.page.getByTestId('modal-delete-expense-confirm');
  }

  get deleteConfirmMessage() {
    return this.page.getByTestId('modal-delete-expense-message');
  }

  get validationError() {
    return this.page.getByTestId('expense-form-error-amount').or(this.page.getByTestId('expense-form-error-description'));
  }

  get validationAmountError() {
    return this.page.getByTestId('expense-form-error-amount');
  }

  expenseRowByDescription(description: string) {
    return this.page.getByTestId('expense-row').filter({ hasText: description });
  }

  get firstEditButton() {
    return this.page.getByTestId('expense-edit').first();
  }

  get firstDeleteButton() {
    return this.page.getByTestId('expense-delete').first();
  }

  async goto() {
    await this.page.goto('/expenses');
  }

  async openAddExpenseModal() {
    await this.addExpenseButton.click();
  }

  async fillExpenseForm(data: ExpenseFormData) {
    await this.formAmount.fill(String(data.amount));
    await this.formDescription.fill(data.description);
    if (data.date) {
      await this.formDate.fill(data.date);
    }
  }

  async submitCreateExpense() {
    await this.formCreateButton.click();
  }

  async submitUpdateExpense() {
    await this.formUpdateButton.click();
  }

  async cancelModal() {
    await this.formCancelButton.click();
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
  }

  async createExpense(data: ExpenseFormData) {
    await this.openAddExpenseModal();
    // Wait for modal and form to be ready (categories may load async)
    await this.modalAddExpenseHeading.waitFor({ state: 'visible', timeout: 5000 });
    await this.formCreateButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.formAmount.waitFor({ state: 'visible', timeout: 5000 });
    // Ensure category options are loaded so form state is valid
    // Options in select elements are not visible until dropdown opens, so check for attached state instead
    await this.page.getByTestId('expense-form-category').locator('option').first().waitFor({ state: 'attached', timeout: 5000 });
    await this.fillExpenseForm(data);
    await this.submitCreateExpense();
  }

  async expectExpenseVisible(description: string, timeout = 5000) {
    await this.expenseRowByDescription(description).waitFor({ state: 'visible', timeout });
  }

  async expectExpenseNotVisible(description: string) {
    await this.expenseRowByDescription(description).waitFor({ state: 'hidden' }).catch(() => {});
  }
}
