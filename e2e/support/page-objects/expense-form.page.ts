/**
 * @fileoverview Expense Form Page Object
 *
 * Encapsulates all interactions with the expense form modal (create/edit).
 * Used for both Add Expense and Edit Expense modals.
 */

import { Page, expect } from '@playwright/test';

export class ExpenseFormPage {
  constructor(private readonly page: Page) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  get addHeading() {
    return this.page.getByRole('heading', { name: 'Add Expense' });
  }

  get editHeading() {
    return this.page.getByRole('heading', { name: 'Edit Expense' });
  }

  get categorySelect() {
    return this.page.getByLabel('Category');
  }

  get amountInput() {
    return this.page.getByLabel('Amount');
  }

  get descriptionInput() {
    return this.page.getByLabel('Description');
  }

  get dateInput() {
    return this.page.getByLabel('Date');
  }

  get createButton() {
    return this.page.getByRole('button', { name: 'Create' });
  }

  get updateButton() {
    return this.page.getByRole('button', { name: 'Update' });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  get amountValidationError() {
    return this.page.getByText('Amount must be greater than 0');
  }

  get invalidAmountError() {
    return this.page.getByText('Invalid amount');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fill the expense form with provided data.
   */
  async fill(data: { amount?: string; description?: string; date?: string }) {
    if (data.amount !== undefined) {
      await this.amountInput.fill(data.amount);
    }
    if (data.description !== undefined) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.date !== undefined) {
      await this.dateInput.fill(data.date);
    }
  }

  /**
   * Clear the amount input.
   */
  async clearAmount() {
    await this.amountInput.clear();
  }

  /**
   * Submit the create expense form.
   */
  async submitCreate() {
    await this.createButton.click();
  }

  /**
   * Submit the update expense form.
   */
  async submitUpdate() {
    await this.updateButton.click();
  }

  /**
   * Cancel and close the modal.
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Create a new expense with the given data.
   * @param data - Expense data to fill in the form
   */
  async createExpense(data: { amount: string; description: string; date?: string }) {
    await this.fill(data);
    await this.submitCreate();
  }

  /**
   * Update an expense with the given data.
   * @param data - Expense data to update
   */
  async updateExpense(data: { amount?: string; description?: string; date?: string }) {
    await this.fill(data);
    await this.submitUpdate();
  }

  /**
   * Get the current value of the amount input.
   */
  async getAmountValue(): Promise<string> {
    return this.amountInput.inputValue();
  }

  /**
   * Get the current value of the description input.
   */
  async getDescriptionValue(): Promise<string> {
    return this.descriptionInput.inputValue();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assert add expense modal is visible.
   */
  async expectAddModalVisible() {
    await expect(this.addHeading).toBeVisible();
    await expect(this.categorySelect).toBeVisible();
    await expect(this.amountInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.dateInput).toBeVisible();
  }

  /**
   * Assert add expense modal is not visible.
   */
  async expectAddModalNotVisible(timeout = 5000) {
    await expect(this.addHeading).not.toBeVisible({ timeout });
  }

  /**
   * Assert edit expense modal is visible.
   */
  async expectEditModalVisible() {
    await expect(this.editHeading).toBeVisible();
  }

  /**
   * Assert edit expense modal is not visible.
   */
  async expectEditModalNotVisible(timeout = 5000) {
    await expect(this.editHeading).not.toBeVisible({ timeout });
  }

  /**
   * Assert amount validation error is visible.
   */
  async expectAmountValidationError() {
    await expect(this.amountValidationError).toBeVisible();
  }

  /**
   * Assert invalid amount error is visible.
   */
  async expectInvalidAmountError(timeout = 2000) {
    await expect(this.invalidAmountError).toBeVisible({ timeout });
  }

  /**
   * Assert description field has expected value.
   */
  async expectDescriptionValue(value: string) {
    await expect(this.descriptionInput).toHaveValue(value);
  }
}
