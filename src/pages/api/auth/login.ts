/**
 * POST /api/auth/login
 *
 * Endpoint for user authentication via email and password.
 * Uses Supabase Auth to verify credentials and establish a session.
 *
 * Authentication: Not required (public endpoint)
 * Rate Limit: Not implemented in MVP (could be added for security)
 *
 * Request Body:
 *   - email: string (required, valid email format)
 *   - password: string (required)
 *
 * Success Response (200):
 *   { success: true, user: { id: string, email: string } }
 *
 * Error Responses:
 *   - 400: Invalid request body or validation errors
 *   - 401: Invalid credentials
 *   - 500: Server error
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import type {
  LoginRequestDto,
  AuthSuccessResponseDto,
  ErrorResponse,
} from '../../../types.ts';

// Prevent pre-rendering for this API route
export const prerender = false;

/**
 * Zod schema for validating login request body.
 * Ensures email format and required fields.
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Wprowadź poprawny adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

/**
 * POST handler for /api/auth/login.
 * Validates credentials and creates a user session.
 *
 * @param context - Astro API context containing request and locals
 * @returns JSON response with user data or error details
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Step 1: Parse request body
    let requestBody: unknown;

    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        } as ErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 2: Validate request body
    const validationResult = loginSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];

      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError.message,
            field: firstError.path[0] as string,
          },
        } as ErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const { email, password } = validationResult.data as LoginRequestDto;

    // Step 3: Attempt authentication with Supabase
    const supabase = context.locals.supabase;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Step 4: Handle authentication errors
    if (error) {
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Nieprawidłowy login lub hasło';
      let errorCode = 'INVALID_CREDENTIALS';

      // Specific error handling for better UX
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Nieprawidłowy login lub hasło';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email nie został potwierdzony';
        errorCode = 'EMAIL_NOT_CONFIRMED';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Nieprawidłowy login lub hasło'; // Don't reveal user existence
      } else {
        // Generic error for unexpected cases
        errorMessage = 'Wystąpił błąd podczas logowania. Spróbuj ponownie';
        errorCode = 'AUTH_ERROR';
      }

      console.error('Login error:', error);

      return new Response(
        JSON.stringify({
          error: {
            code: errorCode,
            message: errorMessage,
          },
        } as ErrorResponse),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 5: Validate response data
    if (!data.user || !data.session) {
      console.error('Login succeeded but no user/session returned');

      return new Response(
        JSON.stringify({
          error: {
            code: 'AUTH_ERROR',
            message: 'Wystąpił błąd podczas logowania. Spróbuj ponownie',
          },
        } as ErrorResponse),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 6: Return success response
    // Note: Supabase automatically handles session cookies (Option A from Q2)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
      } as AuthSuccessResponseDto),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    // Unexpected server error
    console.error('Unexpected error in login endpoint:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Wystąpił błąd serwera. Spróbuj ponownie później',
        },
      } as ErrorResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
