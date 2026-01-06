/**
 * POST /api/generations
 *
 * Endpoint for generating flashcard suggestions from source text.
 * Accepts a block of text, uses AI to generate flashcard pairs,
 * and returns the suggestions for user review.
 *
 * Authentication: Required (via session)
 * Rate Limit: 5 requests per user per minute
 */

import type { APIContext } from 'astro';
import { z } from 'zod';

import type { CreateGenerationResponseDto } from '../../../types.ts';
import {
  generateFlashcardsFromText,
  GenerationError,
} from '../../../lib/services/generation.service.ts';

// Prevent pre-rendering for this API route
export const prerender = false;

/**
 * Zod schema for validating the request body.
 * Ensures source_text is between 1000 and 10000 characters.
 */
const createGenerationSchema = z.object({
  source_text: z
    .string()
    .min(1000, 'Source text must be at least 1000 characters')
    .max(10000, 'Source text must not exceed 10000 characters'),
});

type CreateGenerationRequest = z.infer<typeof createGenerationSchema>;

/**
 * Error response structure.
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * POST handler for /api/generations.
 * Validates request, authenticates user, and generates flashcards.
 *
 * @param context - Astro API context containing request and locals
 * @returns JSON response with generation results or error details
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

    const userId = session.user.id;

    // Step 2: Parse and validate request body
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

    const validationResult = createGenerationSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];

      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              firstError?.message || 'Invalid request body',
          },
        } as ErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const { source_text } = validationResult.data as CreateGenerationRequest;

    // Step 3: Call generation service
    const supabase = context.locals.supabase;

    if (!supabase) {
      throw new Error('Supabase client not available in context');
    }

    const result: CreateGenerationResponseDto =
      await generateFlashcardsFromText(supabase, userId, source_text);

    // Step 4: Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Handle GenerationError (expected errors from the service)
    if (error instanceof GenerationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
          },
        } as ErrorResponse),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Log unexpected errors
    console.error('Unexpected error in POST /api/generations:', error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      } as ErrorResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
