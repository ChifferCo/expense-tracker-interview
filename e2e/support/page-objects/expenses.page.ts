/**
 * @fileoverview Expenses Page Object
 *
 * Encapsulates all interactions with the expenses list page.
 * Provides methods for CRUD operations, filtering, and search.
 */

import { Page, expect } from '@playwright/test';

export class ExpensesPage {
  constructor(private readonly page: Page) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  get heading() {
    return this.page.getByRole('heading', { name: 'Expenses' });
  }

  get addExpenseButton() {
    return this.page.getByRole('button', { name: /add expense/i });
  }

  get searchInput() {
    return this.page.getByPlaceholder('Search expenses...');
  }

  // Date filter buttons
  get allTimeFilter() {
    return this.page.getByRole('button', { name: 'All Time' });
  }

  get thisMonthFilter() {
    return this.page.getByRole('button', { name: 'This Month' });
  }

  get lastMonthFilter() {
    return this.page.getByRole('button', { name: 'Last Month' });
  }

  get last12MonthsFilter() {
    return this.page.getByRole('button', { name: 'Last 12 Months' });
  }

  get customFilter() {
    return this.page.getByRole('button', { name: 'Custom' });
  }

  get fromDateInput() {
    return this.page.getByLabel('From:');
  }

  get toDateInput() {
    return this.page.getByLabel('To:');
  }

  // Delete confirmation modal
  get deleteModalHeading() {
    return this.page.getByRole('heading', { name: 'Delete Expense' });
  }

  get deleteConfirmationText() {
    return this.page.getByText('Are you sure you want to delete this expense?');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to the expenses page.
   * Selects "All Time" filter to ensure all expenses (including future-dated) are visible.
   */
  async goto() {
    await this.page.goto('/expenses');
    await this.expectLoaded();
    // Select "All Time" to ensure future-dated test expenses are visible
    await this.selectDateFilter('allTime');
  }

  /**
   * Open the add expense modal.
   */
  async openAddExpenseModal() {
    await this.addExpenseButton.click();
    await expect(this.page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();
  }

  /**
   * Search for expenses by query.
   */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * Clear the search input.
   */
  async clearSearch() {
    await this.searchInput.clear();
  }

  /**
   * Select a date filter.
   */
  async selectDateFilter(filter: 'allTime' | 'thisMonth' | 'lastMonth' | 'last12Months' | 'custom') {
    const filterMap = {
      allTime: this.allTimeFilter,
      thisMonth: this.thisMonthFilter,
      lastMonth: this.lastMonthFilter,
      last12Months: this.last12MonthsFilter,
      custom: this.customFilter,
    };
    await filterMap[filter].click();
  }

  /**
   * Set custom date range.
   */
  async setCustomDateRange(from: string, to: string) {
    await this.selectDateFilter('custom');
    await this.fromDateInput.fill(from);
    await this.toDateInput.fill(to);
  }

  /**
   * Get expense item locator by description.
   */
  getExpenseItem(description: string) {
    return this.page.locator('li', { hasText: description });
  }

  /**
   * Click edit button on an expense.
   */
  async clickEditOnExpense(description: string) {
    const item = this.getExpenseItem(description);
    await item.getByRole('button', { name: 'Edit' }).click();
    await expect(this.page.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
  }

  /**
   * Click delete button on an expense.
   */
  async clickDeleteOnExpense(description: string) {
    const item = this.getExpenseItem(description);
    await item.getByRole('button', { name: 'Delete' }).click();
  }

  /**
   * Confirm deletion in the modal.
   */
  async confirmDelete() {
    await this.page.locator('button:has-text("Delete")').last().click();
  }

  /**
   * Cancel deletion in the modal.
   */
  async cancelDelete() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assert expenses page is loaded.
   */
  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Assert expense is visible in the list.
   */
  async expectExpenseVisible(description: string, timeout = 10000) {
    await expect(this.page.getByText(description)).toBeVisible({ timeout });
  }

  /**
   * Assert expense is not visible in the list.
   */
  async expectExpenseNotVisible(description: string) {
    await expect(this.page.getByText(description)).not.toBeVisible();
  }

  /**
   * Assert delete confirmation modal is visible.
   */
  async expectDeleteModalVisible() {
    await expect(this.deleteModalHeading).toBeVisible();
    await expect(this.deleteConfirmationText).toBeVisible();
  }

  /**
   * Assert delete confirmation modal is not visible.
   */
  async expectDeleteModalNotVisible() {
    await expect(this.deleteModalHeading).not.toBeVisible();
  }

  /**
   * Assert filter is active (has active styling).
   */
  async expectFilterActive(filter: 'thisMonth' | 'allTime' | 'lastMonth' | 'last12Months' | 'custom') {
    const filterMap = {
      allTime: this.allTimeFilter,
      thisMonth: this.thisMonthFilter,
      lastMonth: this.lastMonthFilter,
      last12Months: this.last12MonthsFilter,
      custom: this.customFilter,
    };
    await expect(filterMap[filter]).toHaveClass(/bg-indigo-600/);
  }

  /**
   * Assert custom date inputs are visible.
   */
  async expectCustomDateInputsVisible() {
    await expect(this.fromDateInput).toBeVisible();
    await expect(this.toDateInput).toBeVisible();
  }

  /**
   * Assert all date filter buttons are visible.
   */
  async expectDateFiltersVisible() {
    await expect(this.allTimeFilter).toBeVisible();
    await expect(this.thisMonthFilter).toBeVisible();
    await expect(this.lastMonthFilter).toBeVisible();
    await expect(this.last12MonthsFilter).toBeVisible();
    await expect(this.customFilter).toBeVisible();
  }
}
