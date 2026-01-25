import type { APIRoute } from "astro";
import { z } from "zod";
import { getFlashcards } from "@/lib/services/flashcard.service";

export const prerender = false;

/**
 * Zod schema for validating GET /flashcards query parameters.
 * - page: Positive integer, defaults to 1
 * - pageSize: Integer between 1 and 100, defaults to 20
 * - search: Optional string, maximum 200 characters, trimmed of whitespace
 */
const getFlashcardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100, "Page size must not exceed 100").default(20),
  search: z
    .string()
    .max(200, "Search term must not exceed 200 characters")
    .transform((val) => val.trim())
    .optional(),
});

type GetFlashcardsQuery = z.infer<typeof getFlashcardsQuerySchema>;

/**
 * GET /api/flashcards
 *
 * Retrieves a paginated list of flashcards for the authenticated user.
 * Supports optional full-text search across flashcard content.
 *
 * Query Parameters:
 * - page: Page number (1-indexed, defaults to 1)
 * - pageSize: Items per page (1-100, defaults to 20)
 * - search: Optional search term for full-text search
 *
 * Success Response (200):
 * {
 *   "data": [{ flashcard objects }],
 *   "pagination": { page, pageSize, totalItems, totalPages }
 * }
 *
 * Error Responses:
 * - 400: Query parameter validation failed
 * - 401: Unauthorized (no valid session)
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
    // Extract and validate query parameters
    const queryParams = Object.fromEntries(context.url.searchParams);

    let validatedParams: GetFlashcardsQuery;
    try {
      validatedParams = getFlashcardsQuerySchema.parse(queryParams);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw validationError;
    }

    // Verify user is authenticated
    const session = context.locals.session;
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      throw new Error("Supabase client not available in context");
    }

    // Call the flashcard service to retrieve paginated data
    const paginatedFlashcards = await getFlashcards(
      supabase,
      session.user.id,
      validatedParams.page,
      validatedParams.pageSize,
      validatedParams.search
    );

    // Return successful response
    return new Response(JSON.stringify(paginatedFlashcards), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the error with context for debugging
    console.error("GET /api/flashcards error:", {
      url: context.url.toString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return generic 500 error to client (do not expose internal details)
    return new Response(
      JSON.stringify({
        error: "An internal server error occurred. Please try again later.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
