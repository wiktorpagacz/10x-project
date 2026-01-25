import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

/**
 * Visual Regression Tests for Login Page
 * 
 * These tests verify the visual appearance of the login page
 * using Playwright's screenshot comparison feature.
 * 
 * Run these tests with: npx playwright test login.visual.spec.ts
 * Update snapshots with: npx playwright test login.visual.spec.ts --update-snapshots
 */

// Global beforeEach: Clear session before each test to ensure clean state
test.beforeEach(async ({ page, context }) => {
  // Clear all cookies and storage
  await context.clearCookies();
  
  // Call logout API to ensure user is logged out
  await page.request.post('http://localhost:3000/api/auth/logout').catch(() => {
    // Ignore errors if already logged out
  });
  
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('Login Page - Visual Regression', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should match login page screenshot', async ({ page }) => {
    // Assert: Page should look the same as baseline
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('should match login page with filled form', async ({ page }) => {
    // Arrange: Fill form fields
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('password123');

    // Assert: Screenshot with filled form
    await expect(page).toHaveScreenshot('login-page-filled.png');
  });

  test('should match login page with validation errors', async ({ page }) => {
    // Arrange: Trigger validation errors
    await loginPage.submit();
    await expect(loginPage.emailError).toBeVisible();

    // Assert: Screenshot with errors
    await expect(page).toHaveScreenshot('login-page-validation-errors.png');
  });

  test('should match login page with visible password', async ({ page }) => {
    // Arrange: Fill password and toggle visibility
    await loginPage.fillPassword('secretPassword');
    await loginPage.togglePasswordVisibility();

    // Assert: Screenshot with visible password
    await expect(page).toHaveScreenshot('login-page-password-visible.png');
  });

  test('should match login page with general error', async ({ page }) => {
    // Arrange: Mock failed login response
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Nieprawidłowy login lub hasło',
          },
        }),
      });
    });

    // Act: Submit login
    await loginPage.login('test@example.com', 'wrongpassword');
    await expect(loginPage.generalError).toBeVisible();

    // Assert: Screenshot with error message
    await expect(page).toHaveScreenshot('login-page-general-error.png');
  });

  test('should match login page in loading state', async ({ page }) => {
    // Arrange: Delay API response to capture loading state
    await page.route('**/api/auth/login', async (route) => {
      // Keep the page in loading state for screenshot
      await new Promise((resolve) => setTimeout(resolve, 5000));
      route.continue();
    });

    // Act: Start login
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('password123');
    const submitPromise = loginPage.submit();

    // Wait for loading state
    await expect(loginPage.submitButton).toHaveText('Logowanie...');

    // Assert: Screenshot during loading
    await expect(page).toHaveScreenshot('login-page-loading.png');

    // Cleanup: Wait for submit to complete
    await submitPromise;
  });

  test('should match form element focus states', async ({ page }) => {
    // Arrange: Focus email input
    await loginPage.emailInput.focus();

    // Assert: Screenshot with focused input
    await expect(page).toHaveScreenshot('login-page-email-focused.png');
  });
});
