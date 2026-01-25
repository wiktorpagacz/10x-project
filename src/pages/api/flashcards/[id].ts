import type { APIRoute } from "astro";
import { z } from "zod";
import { getFlashcardById, updateFlashcard, deleteFlashcard } from "@/lib/services/flashcard.service";

export const prerender = false;

/**
 * Zod schema for validating the PUT request body.
 * - front: Optional string, 1-200 characters
 * - back: Optional string, 1-500 characters
 * - Constraint: At least one of front or back must be provided
 * - Strict mode: Rejects unknown fields
 */
const updateFlashcardSchema = z
  .object({
    front: z.string().min(1, "Front must not be empty").max(200, "Front must not exceed 200 characters").optional(),
    back: z.string().min(1, "Back must not be empty").max(500, "Back must not exceed 500 characters").optional(),
  })
  .strict()
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one of 'front' or 'back' must be provided",
    path: ["body"],
  });

type UpdateFlashcardRequest = z.infer<typeof updateFlashcardSchema>;

/**
 * Zod schema for validating the path parameter.
 * - id: String matching numeric pattern, converted to positive integer
 */
const pathParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Invalid flashcard ID format")
    .transform(Number)
    .pipe(z.number().positive("ID must be a positive integer")),
});

/**
 * GET /api/flashcards/[id]
 *
 * Retrieves a single flashcard by its unique identifier for the authenticated user.
 * The flashcard must belong to the authenticated user (enforced by RLS policies).
 *
 * Path Parameters:
 * - id: The unique identifier of the flashcard to retrieve (positive integer)
 *
 * Success Response (200):
 * {
 *   "id": 42,
 *   "front": "...",
 *   "back": "...",
 *   "source": "manual|ai-full|ai-edited",
 *   "generation_id": 1 | null,
 *   "created_at": "2025-11-02T10:00:00Z",
 *   "updated_at": "2025-11-02T10:00:00Z"
 * }
 *
 * Error Responses:
 * - 400: Invalid flashcard ID format (not a valid positive integer)
 * - 401: Unauthorized (no valid session)
 * - 404: Flashcard not found (does not exist or belongs to another user)
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

    // Extract and validate the ID path parameter
    const { id } = context.params;

    if (!id) {
      return new Response(
        JSON.stringify({
          error: "Invalid flashcard ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the ID as an integer and validate it's positive
    let flashcardId: number;
    try {
      flashcardId = parseInt(id, 10);
      if (!Number.isInteger(flashcardId) || flashcardId <= 0) {
        return new Response(
          JSON.stringify({
            error: "Invalid flashcard ID format",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid flashcard ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve the flashcard from the service
    const flashcard = await getFlashcardById(supabase, session.user.id, flashcardId);

    // Handle not found case
    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: "Flashcard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return the flashcard data
    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    // Log the error with context for debugging
    const userId = context.locals.session?.user?.id;
    const flashcardId = context.params?.id;

    console.error("Error in GET /api/flashcards/[id]:", {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return a generic 500 error response without exposing internal details
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

/**
 * PUT /api/flashcards/[id]
 *
 * Updates an existing flashcard for the authenticated user.
 * Only `front` and `back` fields can be updated; other fields are read-only.
 * At least one of `front` or `back` must be provided.
 * The `updated_at` timestamp is automatically updated by a database trigger.
 *
 * Path Parameters:
 * - id: The unique identifier of the flashcard to update (positive integer)
 *
 * Request Body:
 * {
 *   "front": "Updated question (optional, 1-200 characters)",
 *   "back": "Updated answer (optional, 1-500 characters)"
 * }
 * Note: At least one of front or back must be provided.
 *
 * Success Response (200):
 * The complete updated flashcard object:
 * {
 *   "id": 42,
 *   "front": "...",
 *   "back": "...",
 *   "source": "manual|ai-full|ai-edited",
 *   "generation_id": 1 | null,
 *   "created_at": "2025-11-02T10:00:00Z",
 *   "updated_at": "2025-11-02T10:00:00Z"
 * }
 *
 * Error Responses:
 * - 400: Validation failed (invalid ID format, invalid JSON, constraint violations)
 * - 401: Unauthorized (no valid session)
 * - 403: Forbidden (flashcard belongs to another user)
 * - 404: Flashcard not found
 * - 500: Internal server error
 */
export const PUT: APIRoute = async (context) => {
  try {
    // Step 1: Validate path parameter
    const pathParams = pathParamSchema.safeParse({
      id: context.params.id,
    });

    if (!pathParams.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: pathParams.error.errors.map((err) => ({
            field: err.path.join(".") || "id",
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const flashcardId = pathParams.data.id;

    // Step 2: Verify user is authenticated
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

    const userId = session.user.id;

    // Step 3: Get the Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      throw new Error("Supabase client not available in context");
    }

    // Step 4: Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: [
            {
              field: "body",
              message: "Invalid JSON payload",
            },
          ],
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const bodyValidation = updateFlashcardSchema.safeParse(body);

    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: bodyValidation.error.errors.map((err: z.ZodIssue) => ({
            field: err.path.join(".") || "body",
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Call service to update flashcard
    const updatedFlashcard = await updateFlashcard(
      supabase,
      userId,
      flashcardId,
      bodyValidation.data as UpdateFlashcardRequest
    );

    // Step 6: Handle not found case
    if (!updatedFlashcard) {
      return new Response(
        JSON.stringify({
          error: "Flashcard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Return success response with updated flashcard
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 8: Handle ownership violations (403 Forbidden)
    if (error instanceof Error && error.message === "OWNERSHIP_VIOLATION") {
      return new Response(
        JSON.stringify({
          error: "Forbidden. You do not have permission to update this flashcard.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 9: Log and handle unexpected errors
    const userId = context.locals.session?.user?.id;
    const flashcardId = context.params?.id;

    console.error("Error in PUT /api/flashcards/[id]:", {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return a generic 500 error response without exposing internal details
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

/**
 * DELETE /api/flashcards/[id]
 *
 * Deletes a single flashcard by its unique identifier for the authenticated user.
 * The flashcard must belong to the authenticated user.
 * Returns 204 No Content on successful deletion.
 *
 * Path Parameters:
 * - id: The unique identifier of the flashcard to delete (positive integer)
 *
 * Success Response (204 No Content):
 * No response body
 *
 * Error Responses:
 * - 400: Invalid flashcard ID format (not a valid positive integer)
 * - 401: Unauthorized (no valid session)
 * - 403: Forbidden (flashcard belongs to another user)
 * - 404: Flashcard not found
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // Step 1: Verify user is authenticated
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

    const userId = session.user.id;

    // Step 2: Get the Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      throw new Error("Supabase client not available in context");
    }

    // Step 3: Extract and validate the ID path parameter
    const { id } = context.params;

    if (!id) {
      return new Response(
        JSON.stringify({
          error: "Invalid request parameter",
          details: "The 'id' parameter must be a positive integer.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the ID as an integer and validate it's positive
    let flashcardId: number;
    try {
      flashcardId = parseInt(id, 10);
      if (!Number.isInteger(flashcardId) || flashcardId <= 0) {
        return new Response(
          JSON.stringify({
            error: "Invalid request parameter",
            details: "The 'id' parameter must be a positive integer.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid request parameter",
          details: "The 'id' parameter must be a positive integer.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Attempt to delete the flashcard
    const wasDeleted = await deleteFlashcard(supabase, userId, flashcardId);

    // Handle not found case (flashcard doesn't exist or doesn't belong to user)
    if (!wasDeleted) {
      return new Response(
        JSON.stringify({
          error: "Flashcard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return 204 No Content on successful deletion
    return new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the error with context for debugging
    const userId = context.locals.session?.user?.id;
    const flashcardId = context.params?.id;

    console.error("Error in DELETE /api/flashcards/[id]:", {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return a generic 500 error response without exposing internal details
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
