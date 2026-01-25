import type { APIRoute } from "astro";
import { getFlashcardsDueForReview } from "@/lib/services/review.service";

export const prerender = false;

/**
 * GET /api/reviews
 *
 * Retrieves a list of flashcards due for review today according to a spaced
 * repetition algorithm. This endpoint is invoked when users access their
 * study/review session to continue practicing flashcards at optimal intervals
 * for long-term retention.
 *
 * The endpoint queries the spaced repetition state, identifies flashcards
 * whose next review date has arrived, and returns them in a minimal format
 * suitable for active studying.
 *
 * Success Response (200):
 * An array of ReviewFlashcardDto objects representing flashcards due for
 * review today. The array may be empty if the user has no flashcards due.
 *
 * Example Success Response:
 * [
 *   { "id": 1, "front": "What is TypeScript?", "back": "A typed superset of JavaScript" },
 *   { "id": 5, "front": "What is Astro?", "back": "A modern web framework" }
 * ]
 *
 * Example Response (no flashcards due):
 * []
 *
 * Error Responses:
 * - 401: Unauthorized (no valid session)
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
  try {
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

    // Call the review service to retrieve flashcards due for review
    const flashcards = await getFlashcardsDueForReview(supabase, session.user.id);

    // Return successful response with the array of flashcards
    return new Response(JSON.stringify(flashcards), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Prevent caching of user-specific data
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    // Log the error with context for debugging
    console.error("GET /api/reviews error:", {
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
