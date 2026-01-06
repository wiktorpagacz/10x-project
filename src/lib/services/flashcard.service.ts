import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from 'src/db/database.types';
import type { PaginatedFlashcardsDto, FlashcardDto, FlashcardSource } from 'src/types';

/**
 * Retrieves a paginated list of flashcards for the authenticated user.
 * Supports optional full-text search across the `front` and `back` fields.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param page - The page number for pagination (1-indexed)
 * @param pageSize - The number of flashcards per page
 * @param search - Optional search term for full-text search
 * @returns A paginated response containing flashcards and pagination metadata
 * @throws Error if the database query fails
 */
export async function getFlashcards(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  pageSize: number,
  search?: string
): Promise<PaginatedFlashcardsDto> {
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  try {
    // Build the base query for the flashcards table
    // Exclude sensitive fields: user_id and fts_vector
    let query = supabase
      .from('flashcards')
      .select(
        'id, front, back, source, generation_id, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply full-text search if search term is provided
    if (search && search.trim().length > 0) {
      query = query.textSearch('fts_vector', search.trim(), {
        type: 'websearch',
      });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    // Execute the query
    const { data, count, error } = await query;

    if (error) {
      throw new Error(
        `Database query failed: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error('Unexpected: data is null');
    }

    // Calculate total pages
    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Transform data to FlashcardDto (exclude user_id and fts_vector)
    const flashcardDtos: FlashcardDto[] = data.map(flashcard => ({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      created_at: flashcard.created_at,
      updated_at: flashcard.updated_at,
    }));

    return {
      data: flashcardDtos,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    // Log the error with context for debugging
    console.error('Error in getFlashcards:', {
      userId,
      page,
      pageSize,
      search,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by the API endpoint
    throw error;
  }
}

/**
 * Retrieves a single flashcard by its ID for the authenticated user.
 * Excludes sensitive fields: user_id and fts_vector.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param flashcardId - The ID of the flashcard to retrieve
 * @returns The FlashcardDto if found, null if not found
 * @throws Error if the database query fails
 */
export async function getFlashcardById(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number,
): Promise<FlashcardDto | null> {
  try {
    // Query for the flashcard with the given ID and user_id
    // Exclude sensitive fields: user_id and fts_vector
    const { data, error } = await supabase
      .from('flashcards')
      .select(
        'id, front, back, source, generation_id, created_at, updated_at'
      )
      .eq('user_id', userId)
      .eq('id', flashcardId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Database query failed: ${error.message}`,
      );
    }

    // If no flashcard found, return null
    if (!data) {
      return null;
    }

    // Transform data to FlashcardDto
    const flashcardDto: FlashcardDto = {
      id: data.id,
      front: data.front,
      back: data.back,
      source: data.source,
      generation_id: data.generation_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return flashcardDto;
  } catch (error) {
    // Log the error with context for debugging
    console.error('Error in getFlashcardById:', {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by the API endpoint
    throw error;
  }
}

/**
 * Creates a batch of flashcards for the authenticated user.
 * All flashcards are inserted in a single transaction for data consistency.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param generationId - The ID of the generation session that produced these flashcards
 * @param flashcards - Array of flashcard objects to create (front, back, source)
 * @returns Array of created FlashcardDto objects
 * @throws Error if the database insertion fails or if the generation_id is invalid
 */
export async function createBatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  generationId: number,
  flashcards: Array<{ front: string; back: string; source: FlashcardSource }>
): Promise<FlashcardDto[]> {
  try {
    // Construct the insert payload with user_id and generation_id
    const insertPayload = flashcards.map(flashcard => ({
      user_id: userId,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: generationId,
    }));

    // Perform bulk insert and retrieve the created records in the same operation
    const { data, error } = await supabase
      .from('flashcards')
      .insert(insertPayload)
      .select('id, front, back, source, generation_id, created_at, updated_at');

    if (error) {
      throw new Error(
        `Database insertion failed: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error('Unexpected: inserted data is null');
    }

    // Transform data to FlashcardDto array
    const flashcardDtos: FlashcardDto[] = data.map(flashcard => ({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
      source: flashcard.source,
      generation_id: flashcard.generation_id,
      created_at: flashcard.created_at,
      updated_at: flashcard.updated_at,
    }));

    return flashcardDtos;
  } catch (error) {
    // Log the error with context for debugging
    console.error('Error in createBatch:', {
      userId,
      generationId,
      batchSize: flashcards.length,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by the API endpoint
    throw error;
  }
}

/**
 * Updates a flashcard for the authenticated user.
 * Ensures the user owns the flashcard before updating.
 * Allows partial updates of `front` and `back` fields only.
 * The `updated_at` timestamp and `fts_vector` are automatically updated by database triggers.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param flashcardId - The ID of the flashcard to update
 * @param data - Object containing fields to update (front and/or back, both optional)
 * @returns The updated FlashcardDto if successful, null if flashcard not found
 * @throws Error with message 'OWNERSHIP_VIOLATION' if user does not own the flashcard
 * @throws Error if the database operations fail
 */
export async function updateFlashcard(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number,
  data: {
    front?: string;
    back?: string;
  }
): Promise<FlashcardDto | null> {
  try {
    // Step 1: Fetch the existing flashcard to verify ownership
    const { data: existingFlashcard, error: fetchError } = await supabase
      .from('flashcards')
      .select('id, user_id')
      .eq('id', flashcardId)
      .maybeSingle();

    // Handle fetch errors
    if (fetchError) {
      throw new Error(
        `Database query failed: ${fetchError.message}`,
      );
    }

    // If flashcard not found, return null (will be handled as 404 by the API)
    if (!existingFlashcard) {
      return null;
    }

    // Step 2: Verify ownership (throw custom error for 403 handling)
    if (existingFlashcard.user_id !== userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }

    // Step 3: Build update payload with only the provided fields
    const updatePayload: Record<string, unknown> = {};
    if (data.front !== undefined) {
      updatePayload.front = data.front;
    }
    if (data.back !== undefined) {
      updatePayload.back = data.back;
    }

    // Step 4: Perform the update and retrieve the complete updated record
    // Select all public-facing fields: exclude user_id and fts_vector
    const { data: updatedFlashcard, error: updateError } = await supabase
      .from('flashcards')
      .update(updatePayload)
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .select('id, generation_id, front, back, source, created_at, updated_at')
      .single();

    // Handle update errors
    if (updateError) {
      throw new Error(
        `Database update failed: ${updateError.message}`,
      );
    }

    // Transform to FlashcardDto
    const flashcardDto: FlashcardDto = {
      id: updatedFlashcard.id,
      generation_id: updatedFlashcard.generation_id,
      front: updatedFlashcard.front,
      back: updatedFlashcard.back,
      source: updatedFlashcard.source,
      created_at: updatedFlashcard.created_at,
      updated_at: updatedFlashcard.updated_at,
    };

    return flashcardDto;
  } catch (error) {
    // Log the error with context for debugging
    console.error('Error in updateFlashcard:', {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by the API endpoint
    throw error;
  }
}

/**
 * Deletes a flashcard for the authenticated user.
 * Ensures the user owns the flashcard before deletion.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The ID of the authenticated user
 * @param flashcardId - The ID of the flashcard to delete
 * @returns True if the flashcard was deleted, false if not found
 * @throws Error if the database deletion fails
 */
export async function deleteFlashcard(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number,
): Promise<boolean> {
  try {
    // First, verify that the flashcard exists and belongs to the user
    const { data: existingFlashcard, error: fetchError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(
        `Database query failed: ${fetchError.message}`,
      );
    }

    // If flashcard not found or doesn't belong to user, return false
    if (!existingFlashcard) {
      return false;
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(
        `Database deletion failed: ${deleteError.message}`,
      );
    }

    return true;
  } catch (error) {
    // Log the error with context for debugging
    console.error('Error in deleteFlashcard:', {
      userId,
      flashcardId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw the error to be handled by the API endpoint
    throw error;
  }
}
