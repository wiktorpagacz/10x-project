/**
 * POST /api/auth/register
 *
 * Endpoint for user registration with email and password.
 * Creates a new user account in Supabase Auth and automatically logs them in.
 *
 * Authentication: Not required (public endpoint)
 * Rate Limit: Not implemented in MVP (could be added for security)
 *
 * Request Body:
 *   - email: string (required, valid email format)
 *   - password: string (required, min 8 characters)
 *   - confirmPassword: string (required, must match password)
 *
 * Success Response (201):
 *   { success: true, user: { id: string, email: string } }
 *
 * Error Responses:
 *   - 400: Invalid request body or validation errors
 *   - 409: Email already registered
 *   - 500: Server error
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import type {
  RegisterRequestDto,
  AuthSuccessResponseDto,
  ErrorResponse,
} from '../../../types.ts';

// Prevent pre-rendering for this API route
export const prerender = false;

/**
 * Zod schema for validating registration request body.
 * Ensures email format, password length, and password confirmation match.
 */
const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email jest wymagany')
      .email('Wprowadź poprawny adres email'),
    password: z
      .string()
      .min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirmPassword: z.string().min(1, 'Potwierdź swoje hasło'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła nie są zgodne',
    path: ['confirmPassword'],
  });

/**
 * POST handler for /api/auth/register.
 * Validates input, creates user account, and establishes session.
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
    const validationResult = registerSchema.safeParse(requestBody);

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

    const { email, password } = validationResult.data as RegisterRequestDto;

    // Step 3: Attempt user registration with Supabase
    const supabase = context.locals.supabase;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation is disabled in local dev by default
        // In production, you may want to enable this in Supabase dashboard
        emailRedirectTo: `${context.url.origin}/`,
      },
    });

    // Step 4: Handle registration errors
    if (error) {
      // Map Supabase errors to user-friendly messages
      let errorMessage = 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie';
      let errorCode = 'REGISTRATION_ERROR';
      let statusCode = 500;

      // Specific error handling for better UX
      if (
        error.message.includes('User already registered') ||
        error.message.includes('already been registered')
      ) {
        errorMessage = 'Email jest już zajęty';
        errorCode = 'EMAIL_TAKEN';
        statusCode = 409; // Conflict
      } else if (error.message.includes('Password should be')) {
        errorMessage = 'Hasło nie spełnia wymagań bezpieczeństwa';
        errorCode = 'WEAK_PASSWORD';
        statusCode = 400;
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Wprowadź poprawny adres email';
        errorCode = 'INVALID_EMAIL';
        statusCode = 400;
      }

      console.error('Registration error:', error);

      return new Response(
        JSON.stringify({
          error: {
            code: errorCode,
            message: errorMessage,
            ...(errorCode === 'EMAIL_TAKEN' && { field: 'email' }),
          },
        } as ErrorResponse),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 5: Validate response data
    if (!data.user) {
      console.error('Registration succeeded but no user returned');

      return new Response(
        JSON.stringify({
          error: {
            code: 'REGISTRATION_ERROR',
            message: 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie',
          },
        } as ErrorResponse),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 6: Check if email confirmation is required
    // In local dev, session is usually created immediately
    // In production with email confirmation enabled, session might be null
    if (!data.session) {
      // Email confirmation required - user needs to verify email before login
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email!,
          },
          requiresEmailConfirmation: true,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 7: Return success response with auto-login
    // Per US-001 criterion 3: user should be logged in automatically
    // Supabase automatically handles session cookies (Option A from Q2)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
      } as AuthSuccessResponseDto),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    // Unexpected server error
    console.error('Unexpected error in registration endpoint:', error);

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
