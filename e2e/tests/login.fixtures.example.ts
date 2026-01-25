import { test, expect } from '../fixtures/test-setup';
import { TEST_USERS } from '../fixtures/test-users';

/**
 * Example: Using custom fixtures for simplified test setup
 * 
 * This file demonstrates how to use the extended test fixture
 * that automatically provides LoginPage instance.
 * 
 * Compare this with login.spec.ts to see the difference.
 */

test.describe('Login with Custom Fixtures', () => {
  // No need for beforeEach - loginPage is automatically provided!

  test('should display login form', async ({ loginPage }) => {
    // Assert: loginPage is already initialized and navigated
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should validate empty email', async ({ loginPage }) => {
    // Act: Submit with only password
    await loginPage.fillPassword('password123');
    await loginPage.submit();

    // Assert: Email error should be visible
    await expect(loginPage.emailError).toBeVisible();
  });

  test('should toggle password visibility', async ({ loginPage }) => {
    // Arrange: Fill password
    await loginPage.fillPassword('MyPassword123!');

    // Assert: Initially hidden
    expect(await loginPage.isPasswordVisible()).toBe(false);

    // Act: Toggle
    await loginPage.togglePasswordVisibility();

    // Assert: Now visible
    expect(await loginPage.isPasswordVisible()).toBe(true);
  });

  test('should login successfully', async ({ loginPage, page }) => {
    // Arrange: Valid credentials
    const { email, password } = TEST_USERS.validUser;

    // Act: Login
    await loginPage.login(email, password);

    // Assert: Redirected to home
    await expect(page).toHaveURL('/');
  });
});
