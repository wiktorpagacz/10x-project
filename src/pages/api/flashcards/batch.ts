import type { APIContext } from 'astro';
import { z } from 'zod';
import type { CreateFlashcardsBatchCommand, FlashcardDto } from 'src/types';
import { createBatch } from 'src/lib/services/flashcard.service';

// Prevent pre-rendering for this API route
export const prerender = false;

/**
 * Zod schema for validating individual flashcard items in the batch.
 * Enforces constraints on front/back content and the source field.
 */
const batchFlashcardItemSchema = z.object({
  front: z
    .string()
    .min(1, 'Front must not be empty')
    .max(200, 'Front must not exceed 200 characters'),
  back: z
    .string()
    .min(1, 'Back must not be empty')
    .max(500, 'Back must not exceed 500 characters'),
  source: z
    .enum(['ai-full', 'ai-edited', 'manual'], {
      errorMap: () => ({
        message: 'Source must be one of: ai-full, ai-edited, or manual',
      }),
    }),
});

/**
 * Zod schema for validating the entire request body.
 * Enforces:
 * - generation_id is a positive integer
 * - flashcards array is non-empty and not larger than 100 items
 * - Each flashcard item conforms to batchFlashcardItemSchema
 */
const createFlashcardsBatchSchema = z.object({
  generation_id: z
    .number()
    .int('generation_id must be an integer')
    .positive('generation_id must be a positive integer'),
  flashcards: z
    .array(batchFlashcardItemSchema)
    .min(1, 'flashcards array must contain at least 1 item')
    .max(100, 'flashcards array must not exceed 100 items'),
});

type CreateFlashcardsBatchRequest = z.infer<
  typeof createFlashcardsBatchSchema
>;

/**
 * Error response structure for consistent error handling.
 */
interface ErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * POST /api/flashcards/batch
 *
 * Creates a batch of flashcards for the authenticated user.
 * This endpoint is used after a user reviews AI-generated flashcard suggestions
 * from a generation session. All flashcards are inserted in a single transaction.
 *
 * Authentication: Required (via session)
 *
 * Request Body:
 * {
 *   "generation_id": number (positive integer),
 *   "flashcards": [
 *     {
 *       "front": string (1-200 characters),
 *       "back": string (1-500 characters),
 *       "source": "ai-full" | "ai-edited" | "manual"
 *     },
 *     ...
 *   ]
 * }
 *
 * Success Response (201 Created):
 * Array of FlashcardDto objects representing the created flashcards
 *
 * Error Responses:
 * - 400: Bad Request (invalid JSON, validation errors, missing fields)
 * - 401: Unauthorized (no valid session)
 * - 403: Forbidden (generation_id does not exist or does not belong to the user)
 * - 500: Internal Server Error (database or unexpected errors)
 */
export async function POST(context: APIContext): Promise<Response> {
  try {
    // Step 1: Check authentication
    const session = context.locals.session;

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        } as ErrorResponse),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
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
          error: 'Invalid JSON payload',
        } as ErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate the request body against the schema
    const validationResult = createFlashcardsBatchSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        } as ErrorResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { generation_id: generationId, flashcards } =
      validationResult.data as CreateFlashcardsBatchRequest;

    // Step 3: Get Supabase client from context
    const supabase = context.locals.supabase;

    if (!supabase) {
      throw new Error('Supabase client not available in context');
    }

    // Step 4: Verify that the generation_id belongs to the authenticated user
    const { data: generationRecord, error: generationError } = await supabase
      .from('generations')
      .select('id')
      .eq('id', generationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (generationError) {
      throw new Error(
        `Database query failed when verifying generation: ${generationError.message}`
      );
    }

    if (!generationRecord) {
      return new Response(
        JSON.stringify({
          error: 'Generation not found or access denied',
        } as ErrorResponse),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 5: Call the flashcard service to create the batch
    const createdFlashcards: FlashcardDto[] = await createBatch(
      supabase,
      userId,
      generationId,
      flashcards
    );

    // Step 6: Return successful response with 201 Created status
    return new Response(JSON.stringify(createdFlashcards), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log the error with context for debugging
    console.error('POST /api/flashcards/batch error:', {
      url: context.url.toString(),
      userId: context.locals.session?.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return generic 500 error to client (do not expose internal details)
    return new Response(
      JSON.stringify({
        error: 'An internal server error occurred. Please try again later.',
      } as ErrorResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
