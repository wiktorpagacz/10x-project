/**
 * Mock generation utilities for testing frontend components without AI budget.
 * Enable mock mode by adding ?mock=true to the URL.
 */

import type { CreateGenerationResponseDto, SuggestedFlashcardDto } from '@/types';

/**
 * Generate mock flashcards based on the source text.
 * Creates realistic flashcards that can be used for frontend testing.
 */
export function generateMockFlashcards(sourceText: string): CreateGenerationResponseDto {
  const wordCount = sourceText.trim().split(/\s+/).length;
  const estimatedCardCount = Math.min(Math.max(3, Math.floor(wordCount / 100)), 10);
  
  const mockCards: SuggestedFlashcardDto[] = [];
  
  // Extract some actual words from the text to make it more realistic
  const words = sourceText.trim().split(/\s+/).slice(0, 50);
  const uniqueWords = Array.from(new Set(words));
  
  for (let i = 0; i < estimatedCardCount; i++) {
    const wordSubset = uniqueWords.slice(i * 3, (i * 3) + 5).join(' ');
    
    mockCards.push({
      front: `Mock Question ${i + 1}: What is ${wordSubset}?`,
      back: `Mock Answer ${i + 1}: This is a mock flashcard generated from your text. In real mode, AI would analyze "${wordSubset.slice(0, 50)}..." and create a meaningful Q&A pair.`,
      source: 'ai-full' as const,
    });
  }
  
  // Generate a fake generation ID based on timestamp
  const mockGenerationId = Math.floor(Date.now() / 1000);
  
  return {
    generation_id: mockGenerationId,
    suggested_flashcards: mockCards,
    generated_count: mockCards.length,
  };
}

/**
 * Check if mock mode is enabled via URL parameter.
 * Usage: ?mock=true or ?mock=1
 */
export function isMockModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const mockParam = urlParams.get('mock');
  
  return mockParam === 'true' || mockParam === '1';
}

/**
 * Simulate API delay for realistic mock experience.
 * Returns a promise that resolves after a random delay between 800-1500ms.
 */
export function simulateApiDelay(): Promise<void> {
  const delay = Math.floor(Math.random() * 700) + 800; // 800-1500ms
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate occasional errors for testing error handling (10% chance).
 */
export function shouldSimulateError(): boolean {
  return Math.random() < 0.1; // 10% chance of error
}

/**
 * Generate a mock error response.
 */
export function generateMockError(): { error: string; errorCode: string } {
  const errors = [
    { error: 'Mock API Error: Service temporarily unavailable', errorCode: 'SERVICE_UNAVAILABLE' },
    { error: 'Mock API Error: Rate limit exceeded', errorCode: 'RATE_LIMIT' },
    { error: 'Mock API Error: No flashcards could be generated', errorCode: 'NO_FLASHCARDS_GENERATED' },
  ];
  
  return errors[Math.floor(Math.random() * errors.length)];
}

/**
 * Mock the generation API call.
 * Simulates the POST /api/generations endpoint.
 */
export async function mockGenerationAPI(sourceText: string): Promise<CreateGenerationResponseDto> {
  // Simulate API delay
  await simulateApiDelay();
  
  // Simulate occasional errors
  if (shouldSimulateError()) {
    const error = generateMockError();
    throw new Error(error.error);
  }
  
  // Generate mock flashcards
  return generateMockFlashcards(sourceText);
}

/**
 * Mock the batch save API call.
 * Simulates the POST /api/flashcards/batch endpoint.
 */
export async function mockBatchSaveAPI(
  generationId: number,
  flashcards: Array<{ front: string; back: string; source: string }>
): Promise<{ flashcards: any[] }> {
  // Simulate API delay
  await simulateApiDelay();
  
  // Simulate occasional errors (lower rate for save)
  if (Math.random() < 0.05) { // 5% chance
    throw new Error('Mock API Error: Failed to save flashcards to database');
  }
  
  // Return mock response
  return {
    flashcards: flashcards.map((card, index) => ({
      id: generationId * 1000 + index,
      front: card.front,
      back: card.back,
      source: card.source,
      user_id: 'mock-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
  };
}
