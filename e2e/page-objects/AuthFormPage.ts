import { type Page, type Locator } from '@playwright/test';

/**
 * Base Page Object for authentication forms.
 * Contains common elements and methods shared across login, register, and password recovery pages.
 */
export class AuthFormPage {
  readonly page: Page;
  
  // Common form elements
  readonly form: Locator;
  readonly generalError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize common locators
    this.form = page.getByTestId('auth-form');
    this.generalError = page.getByTestId('auth-general-error');
  }

  /**
   * Check if general error is visible
   */
  async isGeneralErrorVisible(): Promise<boolean> {
    return await this.generalError.isVisible();
  }

  /**
   * Get general error message text
   */
  async getGeneralErrorText(): Promise<string> {
    return await this.generalError.textContent() || '';
  }

  /**
   * Wait for form to be ready
   */
  async waitForFormReady() {
    await this.form.waitFor({ state: 'visible' });
  }

  /**
   * Submit the form
   */
  async submitForm() {
    await this.form.evaluate((form) => {
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    });
  }
}
