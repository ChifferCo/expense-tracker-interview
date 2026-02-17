import type { Page } from '@playwright/test';
import { AppLayout } from './AppLayout.js';

export class ImportPage {
  readonly layout: AppLayout;

  constructor(private readonly page: Page) {
    this.layout = new AppLayout(page);
  }

  get heading() {
    return this.page.getByTestId('import-heading');
  }

  get bulkImportHeading() {
    return this.page.getByTestId('import-bulk-heading');
  }

  get startImportButton() {
    return this.page.getByTestId('import-start-button');
  }

  get importHistoryHeading() {
    return this.page.getByTestId('import-history-heading');
  }

  // Wizard (when open)
  get wizardUploadHeading() {
    return this.page.getByTestId('import-wizard-upload-heading');
  }

  get wizardFileInput() {
    return this.page.getByTestId('import-wizard-file-input');
  }

  get wizardCancelButton() {
    return this.page.getByTestId('import-wizard-cancel');
  }

  get wizardMappingOrPreviewText() {
    return this.page.getByTestId('import-wizard-mapping-step');
  }

  async goto() {
    await this.page.goto('/import');
  }

  async openWizard() {
    await this.startImportButton.click();
  }

  async cancelWizard() {
    await this.wizardCancelButton.click();
  }

  async uploadCsv(filePath: string) {
    await this.wizardFileInput.setInputFiles(filePath);
  }

  async expectImportPageVisible() {
    await this.heading.waitFor({ state: 'visible' });
  }

  async expectWizardUploadVisible(timeout = 5000) {
    await this.wizardUploadHeading.waitFor({ state: 'visible', timeout });
  }

  async expectWizardMappingVisible(timeout = 10000) {
    await this.wizardMappingOrPreviewText.waitFor({ state: 'visible', timeout });
  }
}
