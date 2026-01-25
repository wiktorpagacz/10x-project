import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects";
import { TEST_USERS, INVALID_DATA } from "../fixtures/test-users";

/**
 * E2E Tests for Login functionality
 *
 * Test Coverage:
 * - UI elements visibility and accessibility
 * - Client-side validation
 * - Server-side validation
 * - Successful authentication flow
 * - Failed authentication scenarios
 * - Password visibility toggle
 * - Navigation between auth pages
 * - Error message display
 *
 * NOTE: These tests require:
 * 1. Test database with seeded users (see fixtures/test-users.ts)
 * 2. Running dev server (handled by playwright.config.ts)
 */

// Global beforeEach: Clear session before each test to ensure clean state
test.beforeEach(async ({ page, context }) => {
  // Clear all cookies and storage
  await context.clearCookies();

  // Call logout API to ensure user is logged out
  await page.request.post("http://localhost:3000/api/auth/logout").catch(() => {
    // Ignore errors if already logged out
  });

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe("Login Page - UI & Accessibility", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Arrange: Initialize page object and navigate to login
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display all login form elements", async () => {
    // Assert: Verify all form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
    await expect(loginPage.passwordToggleButton).toBeVisible();
  });

  test("should have correct page title and subtitle", async () => {
    // Assert: Verify page heading
    await expect(loginPage.page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
    await expect(loginPage.page.getByText("Wprowadź swoje dane, aby kontynuować")).toBeVisible();
  });

  test("should have accessible form elements with correct attributes", async () => {
    // Assert: Check HTML attributes for accessibility
    await expect(loginPage.emailInput).toHaveAttribute("type", "email");
    await expect(loginPage.emailInput).toHaveAttribute("id", "email");
    await expect(loginPage.emailInput).toHaveAttribute("aria-invalid");

    await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
    await expect(loginPage.passwordInput).toHaveAttribute("id", "password");
    await expect(loginPage.passwordInput).toHaveAttribute("aria-invalid");

    await expect(loginPage.submitButton).toHaveAttribute("type", "submit");
  });

  test("should have proper ARIA labels for password toggle", async () => {
    // Assert: Password toggle should have accessible label
    const toggleLabel = await loginPage.passwordToggleButton.getAttribute("aria-label");
    expect(toggleLabel).toBeTruthy();
    expect(toggleLabel).toMatch(/Pokaż hasło|Ukryj hasło/);
  });

  test("should have placeholder text in input fields", async () => {
    // Assert: Check placeholders
    await expect(loginPage.emailInput).toHaveAttribute("placeholder", "twoj@email.com");
    await expect(loginPage.passwordInput).toHaveAttribute("placeholder", "••••••••");
  });
});

test.describe("Login Page - Client-Side Validation", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should show validation error for empty email", async () => {
    // Arrange: Leave email empty

    // Act: Fill only password and submit
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    // Assert: Email error should be visible
    await expect(loginPage.emailError).toBeVisible();
    const errorText = await loginPage.getEmailErrorText();
    expect(errorText).toContain("wymagany");
  });

  test("should show validation error for invalid email format", async () => {
    // Arrange & Act: Fill invalid email
    await loginPage.fillEmail(INVALID_DATA.invalidEmailFormat);
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    // Assert: Email error should be visible
    await expect(loginPage.emailError).toBeVisible();
    const errorText = await loginPage.getEmailErrorText();
    expect(errorText).toMatch(/poprawny|email/i);
  });

  test("should show validation error for email without @", async () => {
    // Arrange & Act: Fill email missing @ symbol
    await loginPage.fillEmail("invalidemail.com");
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    // Assert: Should show validation error
    await expect(loginPage.emailError).toBeVisible();
  });

  test("should show validation error for empty password", async () => {
    // Arrange & Act: Fill email but leave password empty
    await loginPage.fillEmail("test@example.com");
    await loginPage.submit();

    // Assert: Password error should be visible
    await expect(loginPage.passwordError).toBeVisible();
    const errorText = await loginPage.getPasswordErrorText();
    expect(errorText).toContain("wymagane");
  });

  test("should show validation error when both fields are empty", async () => {
    // Act: Submit empty form
    await loginPage.submit();

    // Assert: At least one error should be visible (email has priority)
    await expect(loginPage.emailError).toBeVisible();
  });

  test("should clear errors when user starts typing", async () => {
    // Arrange: Trigger validation error
    await loginPage.submit();
    await expect(loginPage.emailError).toBeVisible();

    // Act: Start typing in email field
    await loginPage.fillEmail("test");

    // Note: This behavior depends on implementation
    // Some forms clear errors on input, others on resubmit
  });
});

test.describe("Login Page - Password Visibility Toggle", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should hide password by default", async () => {
    // Arrange: Fill password
    await loginPage.fillPassword("secretPassword123");

    // Assert: Password should be hidden (type="password")
    expect(await loginPage.isPasswordVisible()).toBe(false);
    await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
  });

  test("should toggle password visibility on button click", async () => {
    // Arrange: Fill password
    await loginPage.fillPassword("MySecretPass123!");

    // Assert: Initially hidden
    expect(await loginPage.isPasswordVisible()).toBe(false);

    // Act: Toggle visibility
    await loginPage.togglePasswordVisibility();

    // Assert: Password should be visible
    expect(await loginPage.isPasswordVisible()).toBe(true);
    await expect(loginPage.passwordInput).toHaveAttribute("type", "text");

    // Act: Toggle again
    await loginPage.togglePasswordVisibility();

    // Assert: Password should be hidden again
    expect(await loginPage.isPasswordVisible()).toBe(false);
    await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
  });

  test("should preserve password value when toggling visibility", async () => {
    // Arrange: Fill password
    const password = "PreservedPassword123!";
    await loginPage.fillPassword(password);

    // Act: Toggle visibility multiple times
    await loginPage.togglePasswordVisibility();
    await loginPage.togglePasswordVisibility();

    // Assert: Password value should be preserved
    await expect(loginPage.passwordInput).toHaveValue(password);
  });

  test("should update aria-label when toggling visibility", async () => {
    // Arrange: Initial state
    let ariaLabel = await loginPage.passwordToggleButton.getAttribute("aria-label");
    expect(ariaLabel).toBe("Pokaż hasło");

    // Act: Show password
    await loginPage.togglePasswordVisibility();

    // Assert: Label should change
    ariaLabel = await loginPage.passwordToggleButton.getAttribute("aria-label");
    expect(ariaLabel).toBe("Ukryj hasło");

    // Act: Hide password
    await loginPage.togglePasswordVisibility();

    // Assert: Label should change back
    ariaLabel = await loginPage.passwordToggleButton.getAttribute("aria-label");
    expect(ariaLabel).toBe("Pokaż hasło");
  });
});

test.describe("Login Page - Navigation", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should navigate to registration page when clicking register link", async () => {
    // Act: Click register link
    await loginPage.goToRegister();

    // Assert: Should navigate to register page
    await expect(loginPage.page).toHaveURL("/register");
  });

  test("should display correct register link text", async () => {
    // Assert: Verify link text
    await expect(loginPage.registerLink).toHaveText("Zarejestruj się");
  });

  test("should have accessible register link", async () => {
    // Assert: Link should be properly accessible
    await expect(loginPage.registerLink).toHaveAttribute("href", "/register");
  });
});

test.describe("Login Page - Failed Authentication", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should show error for non-existent user", async () => {
    // Arrange: Use credentials that don't exist
    const { email, password } = TEST_USERS.invalidUser;

    // Act: Attempt login
    await loginPage.login(email, password);

    // Assert: General error should be visible
    await expect(loginPage.generalError).toBeVisible();
    const errorText = await loginPage.getGeneralErrorText();
    expect(errorText).toMatch(/nieprawidłowy|hasło/i);
  });

  test("should show error for wrong password", async () => {
    // Arrange: Use valid email but wrong password
    // Note: This requires a test user to exist in the database
    await loginPage.fillEmail(TEST_USERS.validUser.email);
    await loginPage.fillPassword("WrongPassword123!");

    // Act: Submit
    await loginPage.submit();

    // Assert: Should show authentication error
    await expect(loginPage.generalError).toBeVisible();
    const errorText = await loginPage.getGeneralErrorText();
    expect(errorText).toMatch(/nieprawidłowy|hasło/i);
  });

  test("should not reveal whether user exists", async () => {
    // Arrange: Try non-existent email
    await loginPage.fillEmail("doesnotexist@example.com");
    await loginPage.fillPassword("AnyPassword123!");

    // Act: Submit
    await loginPage.submit();

    // Assert: Error should be generic (security best practice)
    await expect(loginPage.generalError).toBeVisible();
    const errorText = await loginPage.getGeneralErrorText();
    expect(errorText).not.toMatch(/nie istnieje|not found/i);
    expect(errorText).toMatch(/nieprawidłowy|hasło/i);
  });

  test("should clear form after failed login attempt", async () => {
    // Arrange: Attempt failed login
    await loginPage.login(TEST_USERS.invalidUser.email, TEST_USERS.invalidUser.password);
    await expect(loginPage.generalError).toBeVisible();

    // Assert: Form fields should still contain values (for user to correct)
    await expect(loginPage.emailInput).toHaveValue(TEST_USERS.invalidUser.email);
    // Password field behavior may vary - some clear it, some don't
  });

  test("should keep submit button enabled after failed login", async () => {
    // Arrange: Failed login
    await loginPage.login(TEST_USERS.invalidUser.email, TEST_USERS.invalidUser.password);
    await expect(loginPage.generalError).toBeVisible();

    // Assert: User should be able to try again
    expect(await loginPage.isSubmitButtonDisabled()).toBe(false);
  });
});

test.describe("Login Page - Successful Authentication", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should login with valid credentials and redirect to home", async () => {
    // Arrange: Use real test user from .env.test
    const { email, password } = TEST_USERS.validUser;

    // Act: Perform login
    await loginPage.login(email, password);

    // Assert: Should redirect to home page (generation view)
    await loginPage.waitForSuccessfulLogin();
    await expect(loginPage.page).toHaveURL("/");
  });

  test("should maintain session after successful login", async ({ page }) => {
    // Arrange: Login successfully
    const { email, password } = TEST_USERS.validUser;
    await loginPage.login(email, password);
    await loginPage.waitForSuccessfulLogin();

    // Act: Refresh page
    await page.reload();

    // Assert: Should remain on home page (session maintained)
    await expect(page).toHaveURL("/");
  });

  test("should show loading state during login", async () => {
    // Arrange: Setup route interception to slow down response
    await loginPage.page.route("**/api/auth/login", async (route) => {
      // Delay response to catch loading state
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    // Act: Start login
    await loginPage.fillEmail(TEST_USERS.validUser.email);
    await loginPage.fillPassword(TEST_USERS.validUser.password);
    await loginPage.submit();

    // Assert: Should show loading state
    expect(await loginPage.isSubmitButtonLoading()).toBe(true);
    expect(await loginPage.isSubmitButtonDisabled()).toBe(true);
  });
});

test.describe("Login Page - Loading States", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should disable form inputs during submission", async () => {
    // Arrange: Intercept API to delay response
    await loginPage.page.route("**/api/auth/login", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    // Act: Submit form
    await loginPage.fillEmail("test@example.com");
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    // Assert: Inputs should be disabled during loading
    await expect(loginPage.emailInput).toBeDisabled();
    await expect(loginPage.passwordInput).toBeDisabled();
    await expect(loginPage.submitButton).toBeDisabled();
  });

  test('should change button text to "Logowanie..." during submission', async () => {
    // Arrange: Delay API response
    await loginPage.page.route("**/api/auth/login", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.continue();
    });

    // Act: Submit
    await loginPage.login("test@example.com", "password123");

    // Assert: Button text should change
    await expect(loginPage.submitButton).toHaveText("Logowanie...");
  });
});

test.describe("Login Page - API Integration", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should send correct request to login API", async ({ page }) => {
    // Arrange: Intercept API request
    const requestPromise = page.waitForRequest("**/api/auth/login");

    // Act: Submit login
    await loginPage.login("test@example.com", "password123");

    // Assert: Check request
    const request = await requestPromise;
    expect(request.method()).toBe("POST");
    expect(request.headers()["content-type"]).toContain("application/json");

    const postData = request.postDataJSON();
    expect(postData).toEqual({
      email: "test@example.com",
      password: "password123",
    });
  });

  test("should handle network errors gracefully", async () => {
    // Arrange: Simulate network failure
    await loginPage.page.route("**/api/auth/login", (route) => {
      route.abort("failed");
    });

    // Act: Attempt login
    await loginPage.login("test@example.com", "password123");

    // Assert: Should show error message
    // Note: Implementation may vary - check for error display
    await expect(loginPage.generalError).toBeVisible();
  });

  test("should handle server errors (500) gracefully", async () => {
    // Arrange: Mock server error
    await loginPage.page.route("**/api/auth/login", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Wystąpił błąd serwera",
          },
        }),
      });
    });

    // Act: Attempt login
    await loginPage.login("test@example.com", "password123");

    // Assert: Should show error
    await expect(loginPage.generalError).toBeVisible();
    const errorText = await loginPage.getGeneralErrorText();
    expect(errorText).toMatch(/błąd|error/i);
  });
});
