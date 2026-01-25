import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';
import { TEST_USERS } from '../fixtures/test-users';
import {
  mockApiResponse,
  mockSlowApiResponse,
  mockApiError,
  waitForApiRequest,
  clearBrowserStorage,
  fillForm,
  getValidationErrors,
} from '../helpers/test-utils';

/**
 * Example: Using test helpers for cleaner tests
 * 
 * This file demonstrates how to use helper utilities
 * to simplify common test operations.
 */

test.describe('Login with Test Helpers', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Clear browser storage before each test
    await clearBrowserStorage(page);
    
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should handle mocked successful login', async ({ page }) => {
    // Arrange: Mock API response
    await mockApiResponse(page, '**/api/auth/login', {
      status: 200,
      body: {
        success: true,
        user: {
          id: '123',
          email: 'test@example.com',
        },
      },
    });

    // Act: Login
    await loginPage.login('test@example.com', 'password123');

    // Assert: Should redirect
    await expect(page).toHaveURL('/');
  });

  test('should handle mocked validation error', async ({ page }) => {
    // Arrange: Mock validation error
    await mockApiResponse(page, '**/api/auth/login', {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email jest wymagany',
          field: 'email',
        },
      },
    });

    // Act: Submit
    await loginPage.login('', 'password123');

    // Assert: Should show error
    await expect(loginPage.generalError).toBeVisible();
  });

  test('should test loading state with slow API', async ({ page }) => {
    // Arrange: Mock slow response
    await mockSlowApiResponse(page, '**/api/auth/login', 2000);

    // Act: Start login
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('password123');
    await loginPage.submit();

    // Assert: Should show loading state
    expect(await loginPage.isSubmitButtonLoading()).toBe(true);
    await expect(loginPage.submitButton).toBeDisabled();
  });

  test('should handle network error', async ({ page }) => {
    // Arrange: Mock network error
    await mockApiError(page, '**/api/auth/login');

    // Act: Attempt login
    await loginPage.login('test@example.com', 'password123');

    // Assert: Should show error
    await expect(loginPage.generalError).toBeVisible();
  });

  test('should capture API request', async ({ page }) => {
    // Arrange: Setup request listener
    const requestPromise = waitForApiRequest(page, '**/api/auth/login');

    // Act: Login
    await loginPage.login('test@example.com', 'password123');

    // Assert: Check request data
    const request = await requestPromise;
    const postData = request.postDataJSON();
    
    expect(postData).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  test('should fill form using helper', async ({ page }) => {
    // Act: Fill form using helper
    await fillForm(page, {
      'login-email-input': 'test@example.com',
      'login-password-input': 'password123',
    });

    // Assert: Fields should be filled
    await expect(loginPage.emailInput).toHaveValue('test@example.com');
    await expect(loginPage.passwordInput).toHaveValue('password123');
  });

  test('should collect all validation errors', async ({ page }) => {
    // Act: Submit empty form
    await loginPage.submit();

    // Wait for errors to appear
    await expect(loginPage.emailError).toBeVisible();

    // Get all errors
    const errors = await getValidationErrors(page);

    // Assert: Should have validation errors
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((err) => err.includes('wymagany'))).toBe(true);
  });

  test('should test with clean browser state', async ({ page }) => {
    // First login
    await mockApiResponse(page, '**/api/auth/login', {
      status: 200,
      body: {
        success: true,
        user: { id: '123', email: 'test@example.com' },
      },
    });

    await loginPage.login('test@example.com', 'password123');
    await expect(page).toHaveURL('/');

    // Clear storage
    await clearBrowserStorage(page);

    // Navigate back to login
    await loginPage.goto();

    // Assert: Should be able to see login form again
    await expect(loginPage.emailInput).toBeVisible();
  });
});
