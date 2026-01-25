/**
 * Test user fixtures for E2E tests
 * 
 * These credentials are loaded from .env.test file
 * which contains real test user from Supabase.
 * 
 * Environment variables:
 * - E2E_USERNAME: test user email
 * - E2E_PASSWORD: test user password
 * - E2E_USERNAME_ID: test user ID (optional)
 */

/**
 * Get test user credentials from environment
 */
function getTestUser() {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const id = process.env.E2E_USERNAME_ID;

  if (!email || !password) {
    throw new Error(
      'Test user credentials not found in environment. ' +
      'Make sure E2E_USERNAME and E2E_PASSWORD are set in .env.test'
    );
  }

  return { email, password, id };
}

export const TEST_USERS = {
  /**
   * Valid test user from Supabase (loaded from .env.test)
   */
  validUser: getTestUser(),
  
  /**
   * User with invalid credentials (doesn't exist in database)
   */
  invalidUser: {
    email: 'nonexistent@example.com',
    password: 'WrongPassword123!',
  },
} as const;

/**
 * Invalid test data for validation testing
 */
export const INVALID_DATA = {
  emptyEmail: '',
  emptyPassword: '',
  invalidEmailFormat: 'not-an-email',
  invalidEmailFormat2: 'missing@domain',
  invalidEmailFormat3: '@nodomain.com',
  shortPassword: '123',
  tooLongEmail: 'a'.repeat(256) + '@example.com',
} as const;
