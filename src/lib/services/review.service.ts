import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "src/db/database.types";
import type { ReviewFlashcardDto } from "src/types";

/**
 * Retrieves flashcards due for review today for a given user.
 * The flashcards are filtered based on the spaced repetition state table,
 * where the next_review_date is today or earlier.
 *
 * The results are shuffled to provide randomized presentation order
 * for unbiased studying.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param reviewDate - The date to check for due flashcards (defaults to today in UTC)
 * @returns An array of ReviewFlashcardDto objects due for review, shuffled
 * @throws Error if the database query fails
 */
export async function getFlashcardsDueForReview(
  supabase: SupabaseClient<Database>,
  userId: string,
  reviewDate: Date = new Date()
): Promise<ReviewFlashcardDto[]> {
  // Format the review date as YYYY-MM-DD for comparison in the database
  const reviewDateString = reviewDate.toISOString().split("T")[0];

  interface SpacedRepetitionQueryResult {
    flashcard_id: number;
    flashcards: { id: number; front: string; back: string }[];
  }

  // Query the spaced_repetition_state table to find flashcards due for review
  // Join with flashcards table to get only the necessary fields (id, front, back)
  // Note: Using type assertion because the table may not be in the auto-generated types yet
  const { data, error } = (await (supabase as unknown as SupabaseClient)
    .from("spaced_repetition_state")
    .select(
      `
        flashcard_id,
        flashcards!inner(id, front, back)
      `
    )
    .eq("user_id", userId)
    .lte("next_review_date", reviewDateString)) as { data: SpacedRepetitionQueryResult[] | null; error: Error | null };

  // Handle database errors
  if (error) {
    throw new Error(`Failed to retrieve flashcards due for review: ${error.message}`);
  }

  // Transform the query result into ReviewFlashcardDto array
  // The response structure is { flashcard_id, flashcards: [{ id, front, back }] }
  // We extract the flashcard object and ensure proper typing
  const flashcards = (data || []).map((item) => {
    const flashcard = item.flashcards?.[0] || {
      id: 0,
      front: "",
      back: "",
    };

    return {
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
    } as ReviewFlashcardDto;
  });

  // Shuffle the flashcards for randomized presentation
  return shuffleArray(flashcards);
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order in-place.
 * Creates a copy of the input array and returns the shuffled version.
 *
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  // Create a copy to avoid mutating the original array
  const shuffled = [...array];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements at indices i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
