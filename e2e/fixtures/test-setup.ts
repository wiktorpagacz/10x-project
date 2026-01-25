import { test as base } from '@playwright/test';
import { LoginPage } from '../page-objects';

/**
 * Extended Playwright test with custom fixtures
 * 
 * Provides reusable page objects and setup logic for tests.
 * 
 * Usage:
 * import { test, expect } from '../fixtures/test-setup';
 */

type CustomFixtures = {
  loginPage: LoginPage;
};

/**
 * Extended test with LoginPage fixture
 * 
 * Automatically creates and initializes LoginPage for each test.
 */
export const test = base.extend<CustomFixtures>({
  loginPage: async ({ page }, use) => {
    // Setup: Create and navigate to login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Provide to test
    await use(loginPage);
    
    // Teardown: Any cleanup if needed
  },
});

export { expect } from '@playwright/test';
