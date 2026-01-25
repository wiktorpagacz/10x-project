import { test, expect } from '@playwright/test';

/**
 * Smoke Test - Quick verification that environment is set up correctly
 * 
 * This test verifies:
 * - Server is running
 * - Login page is accessible
 * - Environment variables are loaded
 * 
 * Run this first to verify your setup:
 * npx playwright test smoke.spec.ts
 */

// Global beforeEach: Clear session before each test to ensure clean state
test.beforeEach(async ({ page, context }) => {
  // Clear all cookies and storage
  await context.clearCookies();
  
  // Call logout API to ensure user is logged out
  await page.request.post('http://localhost:3000/api/auth/logout').catch(() => {
    // Ignore errors if already logged out
  });
  
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {
    // Ignore errors if page is not loaded yet
  });
});

test.describe('Smoke Test', () => {
  test('should load login page', async ({ page }) => {
    // Act: Navigate to login
    await page.goto('/login');

    // Assert: Page should load
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible();
  });

  test('should have environment variables loaded', async () => {
    // Assert: Check if test user credentials are available
    expect(process.env.E2E_USERNAME).toBeTruthy();
    expect(process.env.E2E_PASSWORD).toBeTruthy();
    expect(process.env.SUPABASE_URL).toBeTruthy();
    expect(process.env.SUPABASE_KEY).toBeTruthy();

    console.log('✅ Environment variables loaded:');
    console.log(`   E2E_USERNAME: ${process.env.E2E_USERNAME}`);
    console.log(`   E2E_USERNAME_ID: ${process.env.E2E_USERNAME_ID || 'not set'}`);
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
    console.log(`   SUPABASE_KEY: ${process.env.SUPABASE_KEY?.substring(0, 20)}...`);
  });

  test('should be able to access Supabase', async ({ page }) => {
    // This test verifies that Supabase connection works
    // by attempting to load a page that uses Supabase
    
    await page.goto('/login');
    
    // If page loads without errors, Supabase connection is OK
    await expect(page.getByTestId('auth-form')).toBeVisible();
  });

  test('server should be running on correct port', async ({ page }) => {
    // Assert: baseURL should be accessible
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Test User Verification', () => {
  test('should verify test user credentials format', async () => {
    const email = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    // Assert: Credentials have expected format
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Valid email format
    expect(password).toBeTruthy();
    expect(password!.length).toBeGreaterThan(5); // Minimum password length
  });

  test('should have valid UUID for test user ID', async () => {
    const userId = process.env.E2E_USERNAME_ID;
    
    if (userId) {
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(userId).toMatch(uuidRegex);
    }
  });
});
