/**
 * POST /api/auth/logout
 *
 * Endpoint for user logout.
 * Terminates the current user session and clears authentication cookies.
 *
 * Authentication: Required (user must be logged in)
 * Rate Limit: Not implemented in MVP
 *
 * Success Response (200):
 *   { success: true }
 *
 * Error Responses:
 *   - 401: Not authenticated
 *   - 500: Server error
 */

import type { APIContext } from 'astro';
import type { ErrorResponse } from '../../../types.ts';

// Prevent pre-rendering for this API route
export const prerender = false;

/**
 * POST handler for /api/auth/logout.
 * Signs out the current user and clears their session.
 *
 * @param context - Astro API context containing request and locals
 * @returns JSON response indicating success or error
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Step 1: Check authentication
    const session = context.locals.session;

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        } as ErrorResponse),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 2: Sign out from Supabase
    const supabase = context.locals.supabase;
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);

      return new Response(
        JSON.stringify({
          error: {
            code: 'LOGOUT_ERROR',
            message: 'Wystąpił błąd podczas wylogowania. Spróbuj ponownie',
          },
        } as ErrorResponse),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 3: Return success response
    // Supabase automatically clears session cookies
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    // Unexpected server error
    console.error('Unexpected error in logout endpoint:', error);

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
