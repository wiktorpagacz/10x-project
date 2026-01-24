/**
 * Generation Service
 * Orchestrates the business logic for generating flashcards from source text.
 * Handles AI service calls, database operations, and error logging.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { sha256 } from '../crypto.ts';
import type { Database } from '../../db/database.types.ts';
import type {
  CreateGenerationResponseDto,
  SuggestedFlashcardDto,
} from '../../types.ts';
import { OpenRouterService, OpenRouterError } from './openrouter.service.ts';
import type { GeneratedFlashcard } from './openrouter.types.ts';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Error that represents a failure during generation.
 * Can be either an AI service error or a database error.
 */
export class GenerationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

/**
 * Generates flashcards from source text using AI.
 * Orchestrates the complete flow: validation, AI call, database operations.
 *
 * @param supabase - The Supabase client for database operations
 * @param userId - The ID of the user making the request
 * @param sourceText - The source text to generate flashcards from
 * @param openRouterApiKey - The OpenRouter API key
 * @returns A DTO containing the generation ID and suggested flashcards
 * @throws GenerationError if anything fails
 */
export async function generateFlashcardsFromText(
  supabase: SupabaseClientType,
  userId: string,
  sourceText: string,
  openRouterApiKey: string,
): Promise<CreateGenerationResponseDto> {
  // Using Meta Llama 3.2 3B Instruct - Free tier, fast and reliable
  // See: https://openrouter.ai/meta-llama/llama-3.2-3b-instruct:free
  // Alternative: google/gemini-2.0-flash-exp:free (can be unstable)
  const MODEL = 'google/gemini-2.0-flash-exp:free';
  const startTime = Date.now();

  try {
    console.log('📊 Generation Service: Starting');
    console.log('📝 Model:', MODEL);
    console.log('👤 User ID:', userId);
    
    // Step 1: Calculate metadata about source text
    const sourceTextLength = sourceText.length;
    console.log('📏 Text length:', sourceTextLength);
    
    const sourceTextHash = await sha256(sourceText);
    console.log('🔐 Text hash:', sourceTextHash);

    // Step 2: Call AI service to generate flashcards
    let generatedFlashcards: GeneratedFlashcard[];

    try {
      console.log('🤖 Creating OpenRouter service instance...');
      
      // Create OpenRouter service instance with the provided API key
      const openRouterService = new OpenRouterService({
        apiKey: openRouterApiKey,
        defaultModel: MODEL,
        appTitle: 'Flashcard Generator',
      });
      
      console.log('✅ OpenRouter service created');
      console.log('🎯 Calling generateFlashcards...');

      // Generate flashcards using the service
      generatedFlashcards = await openRouterService.generateFlashcards(sourceText, {
        model: MODEL,
        minFlashcards: 5,
        maxFlashcards: 15,
        temperature: 0.7,
      });
      
      console.log('✅ Flashcards generated:', generatedFlashcards.length);
    } catch (error) {
      console.error('❌ Error in AI service call:');
      console.error('Error type:', error?.constructor?.name);
      
      // If AI service fails, log the error and re-throw
      if (error instanceof OpenRouterError) {
        console.error('❌ OpenRouterError:', {
          statusCode: error.statusCode,
          errorCode: error.errorCode,
          message: error.message,
          details: error.details,
        });
        await logErrorToDb(supabase, {
          user_id: userId,
          model: MODEL,
          source_text_hash: sourceTextHash,
          source_text_length: sourceTextLength,
          error_code: error.errorCode,
          error_message: error.message,
        });

        throw new GenerationError(
          error.errorCode,
          `Failed to generate flashcards: ${error.message}`,
          error.statusCode,
        );
      }

      // Unexpected error
      await logErrorToDb(supabase, {
        user_id: userId,
        model: MODEL,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        error_code: 'UNKNOWN_ERROR',
        error_message:
          error instanceof Error
            ? error.message
            : 'An unknown error occurred',
      });

      throw new GenerationError(
        'UNKNOWN_ERROR',
        'An unexpected error occurred during generation',
        500,
      );
    }

    // Step 3: Validate we got some results
    if (!generatedFlashcards || generatedFlashcards.length === 0) {
      throw new GenerationError(
        'NO_FLASHCARDS_GENERATED',
        'AI did not generate any flashcards',
        500,
      );
    }

    // Step 4: Record the generation in the database
    const generationDuration = Date.now() - startTime;

    const { data: generationRecord, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        model: MODEL,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        generated_count: generatedFlashcards.length,
        generation_duration: generationDuration,
      })
      .select('id')
      .single();

    if (insertError || !generationRecord) {
      throw new GenerationError(
        'DB_INSERT_FAILED',
        `Failed to record generation: ${insertError?.message || 'Unknown error'}`,
        500,
      );
    }

    // Step 5: Format and return response
    const suggestedFlashcards: SuggestedFlashcardDto[] =
      generatedFlashcards.map((fc) => ({
        front: fc.front,
        back: fc.back,
        source: 'ai-full' as const,
      }));

    return {
      generation_id: generationRecord.id,
      suggested_flashcards: suggestedFlashcards,
      generated_count: generatedFlashcards.length,
    };
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof GenerationError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new GenerationError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
    );
  }
}

/**
 * Logs a generation error to the database.
 * This is a private helper function used by the service.
 *
 * @param supabase - The Supabase client
 * @param errorLog - The error details to log
 */
async function logErrorToDb(
  supabase: SupabaseClientType,
  errorLog: {
    user_id: string;
    model: string;
    source_text_hash: string;
    source_text_length: number;
    error_code: string;
    error_message: string;
  },
): Promise<void> {
  try {
    await supabase.from('generation_error_logs').insert(errorLog);
  } catch {
    // Silently fail if we can't log the error
    // This shouldn't prevent the main error from being reported to the client
    console.error('Failed to log generation error to database', errorLog);
  }
}
