# Page Object Models (POM)

This directory contains Page Object Models for E2E tests using Playwright.

## Overview

The Page Object Model (POM) is a design pattern that:
- Encapsulates page interactions in reusable classes
- Makes tests more maintainable and readable
- Reduces code duplication
- Provides a single source of truth for selectors

## Structure

```
e2e/
├── page-objects/          # Page Object Model classes
│   ├── LoginPage.ts       # Login page interactions
│   ├── AuthFormPage.ts    # Base auth form (shared)
│   └── index.ts           # Exports
└── tests/                 # Test files using POMs
    └── login.spec.ts      # Login page tests
```

## Usage

### Basic Example

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

test('user can login', async ({ page }) => {
  // Arrange: Create page object
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act: Perform login
  await loginPage.login('user@example.com', 'password123');

  // Assert: Verify redirect
  await loginPage.waitForSuccessfulLogin();
  await expect(page).toHaveURL('/');
});
```

### Advanced Example

```typescript
test('should show validation errors', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Submit empty form
  await loginPage.submit();

  // Check specific errors
  expect(await loginPage.isEmailErrorVisible()).toBe(true);
  expect(await loginPage.getEmailErrorText()).toContain('wymagane');
});
```

## Guidelines

### Selector Strategy

All selectors use `data-testid` attributes for resilience:
- ✅ `page.getByTestId('login-email-input')`
- ❌ `page.locator('.email-input')` (fragile CSS selectors)
- ❌ `page.locator('input[type="email"]')` (too generic)

### Method Naming

- **Actions**: Use verb prefix (`fill`, `click`, `toggle`, `submit`)
  - `fillEmail()`, `clickSubmit()`, `togglePasswordVisibility()`
- **Queries**: Use `get` or `is` prefix
  - `getEmailErrorText()`, `isEmailErrorVisible()`
- **Navigation**: Use `goto` or `navigateTo`
  - `goto()`, `navigateToRegister()`

### Method Organization

```typescript
export class LoginPage {
  // 1. Properties (locators)
  readonly emailInput: Locator;
  
  // 2. Constructor
  constructor(page: Page) { }
  
  // 3. Navigation methods
  async goto() { }
  
  // 4. Action methods
  async fillEmail() { }
  async submit() { }
  
  // 5. Complex flows
  async login() { }
  
  // 6. Query methods
  async isEmailErrorVisible() { }
  async getEmailErrorText() { }
}
```

## Best Practices

### 1. One Page Object per Page/Component

Each distinct page or major component gets its own POM:
- `LoginPage` - Login form
- `RegisterPage` - Registration form
- `DashboardPage` - Main dashboard

### 2. Composition over Inheritance

For shared functionality, use composition:

```typescript
export class LoginPage {
  readonly authForm: AuthFormPage;
  
  constructor(page: Page) {
    this.authForm = new AuthFormPage(page);
  }
  
  async getGeneralError() {
    return this.authForm.getGeneralErrorText();
  }
}
```

### 3. Return Meaningful Values

Query methods should return useful types:

```typescript
// ✅ Good
async isEmailErrorVisible(): Promise<boolean> {
  return await this.emailError.isVisible();
}

// ❌ Avoid
async checkEmailError() {
  return this.emailError; // Returns locator, not useful
}
```

### 4. Encapsulate Waits

Handle waits inside page objects:

```typescript
async waitForSuccessfulLogin() {
  await this.page.waitForURL('/');
}
```

### 5. Keep Tests Clean

Tests should read like documentation:

```typescript
// ✅ Good - Clear and readable
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'pass123');
  await loginPage.waitForSuccessfulLogin();
});

// ❌ Bad - Implementation details in test
test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill('user@test.com');
  await page.getByTestId('login-password-input').fill('pass123');
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL('/');
});
```

## Available Page Objects

### LoginPage

Handles all login form interactions.

**Key Methods:**
- `goto()` - Navigate to login page
- `login(email, password)` - Complete login flow
- `fillEmail(email)` - Fill email field
- `fillPassword(password)` - Fill password field
- `submit()` - Submit the form
- `togglePasswordVisibility()` - Show/hide password
- `isEmailErrorVisible()` - Check email error state
- `getGeneralErrorText()` - Get error message

**Example:**
```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('test@example.com', 'password123');
```

### AuthFormPage

Base class for common auth form elements.

**Key Methods:**
- `isGeneralErrorVisible()` - Check general error state
- `getGeneralErrorText()` - Get general error message
- `waitForFormReady()` - Wait for form to load

## Testing with POMs

### Follow AAA Pattern

**Arrange, Act, Assert** structure:

```typescript
test('should validate email', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act
  await loginPage.fillEmail('invalid-email');
  await loginPage.submit();

  // Assert
  await expect(loginPage.emailError).toBeVisible();
});
```

### Use beforeEach for Setup

```typescript
test.describe('Login Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('test 1', async () => {
    // loginPage is ready
  });
});
```

## Maintenance

When UI changes:
1. Update the `data-testid` in the component
2. Update the corresponding locator in the POM
3. Tests remain unchanged ✨

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Testing Guidelines](../../.ai/testing-rules.md)
