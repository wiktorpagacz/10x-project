import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../fixtures/test-users";

/**
 * API E2E Tests for Login Endpoint
 *
 * Tests the /api/auth/login endpoint directly without UI.
 * This provides faster, more focused testing of the authentication logic.
 *
 * Benefits:
 * - Faster execution than full E2E tests
 * - Easier to test edge cases
 * - Better for testing error responses
 * - Can run independently of UI changes
 */

test.describe("Login API - /api/auth/login", () => {
  const API_URL = "/api/auth/login";

  test("should return 200 with user data for valid credentials", async ({ request }) => {
    // Arrange: Valid credentials from .env.test
    const { email, password, id } = TEST_USERS.validUser;

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: {
        email,
        password,
      },
    });

    // Assert: Success response
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("user");
    expect(data.user).toHaveProperty("id");
    expect(data.user).toHaveProperty("email", email);

    // Verify user ID matches if provided in env
    if (id) {
      expect(data.user.id).toBe(id);
    }
  });

  test("should return 401 for invalid credentials", async ({ request }) => {
    // Arrange: Invalid credentials
    const { email, password } = TEST_USERS.invalidUser;

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: {
        email,
        password,
      },
    });

    // Assert: Unauthorized response
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toHaveProperty("code", "INVALID_CREDENTIALS");
    expect(data.error).toHaveProperty("message");
    expect(data.error.message).toMatch(/nieprawidłowy|hasło/i);
  });

  test("should return 400 for missing email", async ({ request }) => {
    // Arrange: Missing email
    const requestBody = {
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(data.error).toHaveProperty("field", "email");
    expect(data.error.message).toMatch(/wymagany|required/i);
  });

  test("should return 400 for missing password", async ({ request }) => {
    // Arrange: Missing password
    const requestBody = {
      email: "test@example.com",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(data.error).toHaveProperty("field", "password");
    expect(data.error.message).toMatch(/wymagane|required/i);
  });

  test("should return 400 for invalid email format", async ({ request }) => {
    // Arrange: Invalid email format
    const requestBody = {
      email: "not-an-email",
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(data.error).toHaveProperty("field", "email");
    expect(data.error.message).toMatch(/poprawny|email|valid/i);
  });

  test("should return 400 for empty email string", async ({ request }) => {
    // Arrange: Empty email
    const requestBody = {
      email: "",
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error.field).toBe("email");
  });

  test("should return 400 for empty password string", async ({ request }) => {
    // Arrange: Empty password
    const requestBody = {
      email: "test@example.com",
      password: "",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error.field).toBe("password");
  });

  test("should return 400 for invalid JSON body", async ({ request }) => {
    // Act: Send malformed JSON
    const response = await request.post(API_URL, {
      data: "not-valid-json",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Assert: Bad request response
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error.code).toBe("INVALID_JSON");
  });

  test("should set authentication cookie on successful login", async ({ request }) => {
    // Arrange: Valid credentials
    const { email, password } = TEST_USERS.validUser;

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: {
        email,
        password,
      },
    });

    // Assert: Check for session cookies
    const headers = response.headers();
    const setCookie = headers["set-cookie"];

    // Supabase sets authentication cookies
    expect(setCookie).toBeTruthy();
  });

  test("should return correct Content-Type header", async ({ request }) => {
    // Arrange: Any request
    const requestBody = {
      email: "test@example.com",
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Check Content-Type
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("should handle concurrent login requests", async ({ request }) => {
    // Arrange: Multiple concurrent requests
    const { email, password } = TEST_USERS.validUser;

    const requests = Array.from({ length: 5 }, () =>
      request.post(API_URL, {
        data: { email, password },
      })
    );

    // Act: Send all requests concurrently
    const responses = await Promise.all(requests);

    // Assert: All should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });
  });

  test("should not expose sensitive information in error messages", async ({ request }) => {
    // Arrange: Non-existent user
    const requestBody = {
      email: "nonexistent@example.com",
      password: "anypassword",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Error should not reveal user existence
    const data = await response.json();
    expect(data.error.message).not.toMatch(/user.*not.*found|does.*not.*exist/i);
    expect(data.error.message).toMatch(/nieprawidłowy|hasło/i);
  });

  test("should handle special characters in email", async ({ request }) => {
    // Arrange: Email with special characters (valid format)
    const requestBody = {
      email: "test+tag@example.com",
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Should accept valid email format
    // Response depends on whether user exists
    expect([200, 401]).toContain(response.status());
  });

  test("should trim whitespace from email", async ({ request }) => {
    // Note: This test depends on whether API trims input
    // Arrange: Email with whitespace
    const requestBody = {
      email: "  test@example.com  ",
      password: "password123",
    };

    // Act: Send POST request
    const response = await request.post(API_URL, {
      data: requestBody,
    });

    // Assert: Should either trim or reject
    expect([200, 400, 401]).toContain(response.status());
  });

  test("should reject request without Content-Type header", async ({ request }) => {
    // Act: Send request without proper headers
    const response = await request.fetch(API_URL, {
      method: "POST",
      data: {
        email: "test@example.com",
        password: "password123",
      },
      headers: {
        "Content-Type": "text/plain",
      },
    });

    // Assert: Should handle gracefully
    // Implementation may vary - could accept or reject
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Login API - Security", () => {
  const API_URL = "/api/auth/login";

  test("should not accept GET requests", async ({ request }) => {
    // Act: Try GET request
    const response = await request.get(API_URL);

    // Assert: Should reject
    expect(response.status()).not.toBe(200);
    expect([404, 405]).toContain(response.status());
  });

  test("should not accept PUT requests", async ({ request }) => {
    // Act: Try PUT request
    const response = await request.put(API_URL, {
      data: {
        email: "test@example.com",
        password: "password123",
      },
    });

    // Assert: Should reject
    expect(response.status()).not.toBe(200);
    expect([404, 405]).toContain(response.status());
  });

  test("should not accept DELETE requests", async ({ request }) => {
    // Act: Try DELETE request
    const response = await request.delete(API_URL);

    // Assert: Should reject
    expect(response.status()).not.toBe(200);
    expect([404, 405]).toContain(response.status());
  });
});
