import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the Login page.
 * Encapsulates all interactions with the login form.
 */
export class LoginPage {
  readonly page: Page;
  
  // URL
  readonly url = '/login';
  
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggleButton: Locator;
  readonly submitButton: Locator;
  
  // Error messages
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly generalError: Locator;
  
  // Links
  readonly registerLink: Locator;
  
  // Form container
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators using data-testid attributes
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.passwordToggleButton = page.getByTestId('login-password-input-toggle');
    this.submitButton = page.getByTestId('login-submit-button');
    
    this.emailError = page.getByTestId('login-email-error');
    this.passwordError = page.getByTestId('login-password-input-error');
    this.generalError = page.getByTestId('auth-general-error');
    
    this.registerLink = page.getByTestId('login-register-link');
    
    this.form = page.getByTestId('auth-form');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto(this.url);
  }

  /**
   * Fill in the email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.passwordToggleButton.click();
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with email and password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Check if email error is visible
   */
  async isEmailErrorVisible(): Promise<boolean> {
    return await this.emailError.isVisible();
  }

  /**
   * Check if password error is visible
   */
  async isPasswordErrorVisible(): Promise<boolean> {
    return await this.passwordError.isVisible();
  }

  /**
   * Check if general error is visible
   */
  async isGeneralErrorVisible(): Promise<boolean> {
    return await this.generalError.isVisible();
  }

  /**
   * Get email error message
   */
  async getEmailErrorText(): Promise<string> {
    return await this.emailError.textContent() || '';
  }

  /**
   * Get password error message
   */
  async getPasswordErrorText(): Promise<string> {
    return await this.passwordError.textContent() || '';
  }

  /**
   * Get general error message
   */
  async getGeneralErrorText(): Promise<string> {
    return await this.generalError.textContent() || '';
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if submit button shows loading state
   */
  async isSubmitButtonLoading(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    return text?.includes('Logowanie...') || false;
  }

  /**
   * Wait for navigation after successful login
   */
  async waitForSuccessfulLogin() {
    await this.page.waitForURL('/');
  }

  /**
   * Check if password field is showing text (not obscured)
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }
}
