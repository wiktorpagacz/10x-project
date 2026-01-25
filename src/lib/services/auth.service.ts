/**
 * Authentication service for API calls.
 * Centralizes all auth-related HTTP requests.
 */

import type { AuthSuccessResponseDto, ErrorResponse } from "@/types";
import type { LoginFormData, RegisterFormData } from "@/lib/validation/auth-schemas";

/**
 * Handle authentication API response.
 * Parses response and throws appropriate errors.
 */
async function handleAuthResponse(response: Response): Promise<AuthSuccessResponseDto> {
  const data = await response.json();

  if (!response.ok) {
    throw data as ErrorResponse;
  }

  return data as AuthSuccessResponseDto;
}

/**
 * Authentication service with all auth-related API calls.
 */
export const authService = {
  /**
   * Login user with email and password.
   * @throws {ErrorResponse} If login fails
   */
  async login(credentials: LoginFormData): Promise<AuthSuccessResponseDto> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    return handleAuthResponse(response);
  },

  /**
   * Register new user account.
   * @throws {ErrorResponse} If registration fails
   */
  async register(data: RegisterFormData): Promise<AuthSuccessResponseDto> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleAuthResponse(response);
  },

  /**
   * Logout current user.
   * @throws {Error} If logout fails
   */
  async logout(): Promise<void> {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.error?.message || "Logout failed");
    }
  },

  /**
   * Send password recovery email.
   * @throws {ErrorResponse} If request fails
   * @note This feature is OUT OF MVP SCOPE
   */
  async recoverPassword(email: string): Promise<void> {
    const response = await fetch("/api/auth/recover-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw data as ErrorResponse;
    }
  },
};
