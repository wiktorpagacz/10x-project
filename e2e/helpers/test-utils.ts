import type { Page } from '@playwright/test';

/**
 * Test helper utilities for E2E tests
 * 
 * Provides reusable functions for common test operations.
 */

/**
 * Wait for network idle (no requests for specified time)
 * Useful after form submissions or page navigations
 */
export async function waitForNetworkIdle(page: Page, timeout = 500): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Mock API response
 * Simplifies mocking API endpoints in tests
 */
export async function mockApiResponse(
  page: Page,
  url: string,
  response: {
    status: number;
    body: unknown;
  }
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Mock slow API response
 * Useful for testing loading states
 */
export async function mockSlowApiResponse(
  page: Page,
  url: string,
  delay: number,
  response?: {
    status: number;
    body: unknown;
  }
): Promise<void> {
  await page.route(url, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    if (response) {
      route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Mock API error
 * Simulates network or server errors
 */
export async function mockApiError(page: Page, url: string, errorCode?: string): Promise<void> {
  await page.route(url, (route) => {
    route.abort(errorCode || 'failed');
  });
}

/**
 * Wait for API request to complete
 * Returns the request for assertions
 */
export async function waitForApiRequest(page: Page, url: string) {
  return await page.waitForRequest(url);
}

/**
 * Wait for API response
 * Returns the response for assertions
 */
export async function waitForApiResponse(page: Page, url: string) {
  return await page.waitForResponse(url);
}

/**
 * Clear browser storage (cookies, localStorage, sessionStorage)
 * Useful for ensuring clean state between tests
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set localStorage item
 * Useful for setting up test state
 */
export async function setLocalStorage(
  page: Page,
  key: string,
  value: string
): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key, value }
  );
}

/**
 * Get localStorage item
 * Useful for verifying test state
 */
export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((key) => localStorage.getItem(key), key);
}

/**
 * Wait for element to be stable (not animating)
 * Useful before taking screenshots
 */
export async function waitForElementStable(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  
  // Wait for animations to complete
  await page.waitForTimeout(100);
}

/**
 * Fill form fields from object
 * Simplifies filling multiple form fields
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [testId, value] of Object.entries(fields)) {
    await page.getByTestId(testId).fill(value);
  }
}

/**
 * Get all validation errors on page
 * Returns array of error messages
 */
export async function getValidationErrors(page: Page): Promise<string[]> {
  const errors = await page.locator('[role="alert"]').allTextContents();
  return errors.filter((error) => error.trim().length > 0);
}

/**
 * Take screenshot with timestamp
 * Useful for debugging
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Retry action until condition is met
 * Useful for flaky tests
 */
export async function retryUntil<T>(
  action: () => Promise<T>,
  condition: (result: T) => boolean,
  maxAttempts = 5,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await action();
    
    if (condition(result)) {
      return result;
    }
    
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Condition not met after ${maxAttempts} attempts`);
}

/**
 * Check if element has CSS class
 */
export async function hasClass(page: Page, selector: string, className: string): Promise<boolean> {
  const element = page.locator(selector);
  const classes = await element.getAttribute('class');
  return classes?.split(' ').includes(className) || false;
}

/**
 * Wait for URL to match pattern
 */
export async function waitForUrl(page: Page, pattern: string | RegExp): Promise<void> {
  await page.waitForURL(pattern);
}

/**
 * Simulate slow network
 * Useful for testing loading states
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (50 * 1024) / 8, // 50kb/s
    uploadThroughput: (50 * 1024) / 8,
    latency: 500, // 500ms latency
  });
}

/**
 * Reset network conditions
 */
export async function resetNetworkConditions(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.disable');
}
