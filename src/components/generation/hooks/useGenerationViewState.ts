import { useState, useCallback } from 'react';
import type {
  GenerationViewState,
  GenerationViewStateType,
  SuggestedFlashcardWithState,
  ErrorInfo,
} from '../types';
import type { CreateGenerationResponseDto } from '@/types';

const STORAGE_KEY_SOURCE_TEXT = 'generation-view-source-text';

/**
 * Main state management hook for the Generation View.
 * Manages the complete state machine and all state transitions.
 * 
 * State Machine Flow:
 * idle → generating → reviewing → saving → idle
 *   ↑       ↓           ↓           ↓
 *   └─────error ←───────┴───────────┘
 */
export function useGenerationViewState() {
  const [state, setState] = useState<GenerationViewState>({
    status: 'idle',
    sourceText: loadSourceTextFromStorage(),
    suggestedFlashcards: [],
    generationId: null,
    selectedCardIndex: null,
    isEditing: false,
    error: null,
    retryCount: 0,
    toasts: [],
    infoBoxExpanded: false,
    confirmDialogOpen: false,
  });

  // ========== SOURCE TEXT MANAGEMENT ========== //

  const setSourceText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, sourceText: text }));
    // Persist to localStorage for recovery
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_SOURCE_TEXT, text);
      } catch (e) {
        console.warn('Failed to persist source text to localStorage', e);
      }
    }
  }, []);

  // ========== GENERATION WORKFLOW ========== //

  const startGeneration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'generating',
      error: null,
    }));
  }, []);

  const completeGeneration = useCallback((response: CreateGenerationResponseDto) => {
    // Transform API response to client-side state
    const flashcardsWithState: SuggestedFlashcardWithState[] = response.suggested_flashcards.map(
      (card, index) => ({
        ...card,
        id: `card-${response.generation_id}-${index}`,
        status: 'pending' as const,
        isEdited: false,
      })
    );

    setState((prev) => ({
      ...prev,
      status: 'reviewing',
      suggestedFlashcards: flashcardsWithState,
      generationId: response.generation_id,
      retryCount: 0, // Reset retry count on success
      error: null,
    }));
  }, []);

  const setGenerationError = useCallback((error: ErrorInfo) => {
    setState((prev) => ({
      ...prev,
      status: 'error',
      error,
    }));
  }, []);

  const retryGeneration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  // ========== CARD REVIEW ACTIONS ========== //

  const acceptCard = useCallback((index: number) => {
    setState((prev) => {
      const updated = [...prev.suggestedFlashcards];
      if (updated[index]) {
        updated[index] = { ...updated[index], status: 'accepted' };
      }
      return { ...prev, suggestedFlashcards: updated };
    });
  }, []);

  const rejectCard = useCallback((index: number) => {
    setState((prev) => {
      const updated = [...prev.suggestedFlashcards];
      if (updated[index]) {
        updated[index] = { ...updated[index], status: 'rejected' };
      }
      return { ...prev, suggestedFlashcards: updated };
    });
  }, []);

  const acceptAllCards = useCallback(() => {
    setState((prev) => {
      const updated = prev.suggestedFlashcards.map(card => ({
        ...card,
        status: 'accepted' as const,
      }));
      return { ...prev, suggestedFlashcards: updated };
    });
  }, []);

  const rejectAllCards = useCallback(() => {
    setState((prev) => {
      const updated = prev.suggestedFlashcards.map(card => ({
        ...card,
        status: 'rejected' as const,
      }));
      return { ...prev, suggestedFlashcards: updated };
    });
  }, []);

  const selectCardForEdit = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedCardIndex: index,
      isEditing: true,
    }));
  }, []);

  const updateEditedCard = useCallback((front: string, back: string, index: number) => {
    setState((prev) => {
      const cardIndex = index !== undefined ? index : prev.selectedCardIndex;
      if (cardIndex === null) return prev;

      const updated = [...prev.suggestedFlashcards];
      const card = updated[cardIndex];
      
      if (card) {
        updated[cardIndex] = {
          ...card,
          front,
          back,
          status: 'accepted', // Auto-accept edited cards
          isEdited: true,
          source: 'ai-edited' as const,
        };
      }

      return {
        ...prev,
        suggestedFlashcards: updated,
        isEditing: false,
        selectedCardIndex: null,
      };
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isEditing: false,
      selectedCardIndex: null,
    }));
  }, []);

  // ========== SAVE WORKFLOW ========== //

  const startSave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'saving',
      error: null,
    }));
  }, []);

  const completeSave = useCallback(() => {
    // Clear localStorage on successful save
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_SOURCE_TEXT);
      } catch (e) {
        console.warn('Failed to clear localStorage', e);
      }
    }

    // Reset to idle state
    setState({
      status: 'idle',
      sourceText: '',
      suggestedFlashcards: [],
      generationId: null,
      selectedCardIndex: null,
      isEditing: false,
      error: null,
      retryCount: 0,
      toasts: [],
      infoBoxExpanded: false,
      confirmDialogOpen: false,
    });
  }, []);

  const setSaveError = useCallback((error: ErrorInfo) => {
    setState((prev) => ({
      ...prev,
      status: 'error',
      error,
    }));
  }, []);

  // ========== MODAL MANAGEMENT ========== //

  const toggleInfoBox = useCallback(() => {
    setState((prev) => ({
      ...prev,
      infoBoxExpanded: !prev.infoBoxExpanded,
    }));
  }, []);

  const setInfoBoxExpanded = useCallback((expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      infoBoxExpanded: expanded,
    }));
  }, []);

  const openConfirmDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      confirmDialogOpen: true,
    }));
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      confirmDialogOpen: false,
    }));
  }, []);

  // ========== STATE RESET ========== //

  const resetState = useCallback(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_SOURCE_TEXT);
      } catch (e) {
        console.warn('Failed to clear localStorage', e);
      }
    }

    setState({
      status: 'idle',
      sourceText: '',
      suggestedFlashcards: [],
      generationId: null,
      selectedCardIndex: null,
      isEditing: false,
      error: null,
      retryCount: 0,
      toasts: [],
      infoBoxExpanded: false,
      confirmDialogOpen: false,
    });
  }, []);

  // ========== HELPER GETTERS ========== //

  const getAcceptedCards = useCallback(() => {
    return state.suggestedFlashcards.filter((card) => card.status === 'accepted');
  }, [state.suggestedFlashcards]);

  const getSelectedCard = useCallback(() => {
    if (state.selectedCardIndex === null) return null;
    return state.suggestedFlashcards[state.selectedCardIndex] || null;
  }, [state.selectedCardIndex, state.suggestedFlashcards]);

  return {
    // State
    state,
    status: state.status,
    sourceText: state.sourceText,
    suggestedFlashcards: state.suggestedFlashcards,
    generationId: state.generationId,
    selectedCardIndex: state.selectedCardIndex,
    isEditing: state.isEditing,
    error: state.error,
    retryCount: state.retryCount,
    infoBoxExpanded: state.infoBoxExpanded,
    confirmDialogOpen: state.confirmDialogOpen,

    // Source text
    setSourceText,

    // Generation workflow
    startGeneration,
    completeGeneration,
    setGenerationError,
    retryGeneration,

    // Card actions
    acceptCard,
    rejectCard,
    acceptAllCards,
    rejectAllCards,
    selectCardForEdit,
    updateEditedCard,
    cancelEdit,

    // Save workflow
    startSave,
    completeSave,
    setSaveError,

    // Modal management
    toggleInfoBox,
    setInfoBoxExpanded,
    openConfirmDialog,
    closeConfirmDialog,

    // Utilities
    resetState,
    getAcceptedCards,
    getSelectedCard,
  };
}

// ========== HELPER FUNCTIONS ========== //

/**
 * Load source text from localStorage for recovery after refresh
 */
function loadSourceTextFromStorage(): string {
  // Check if we're running in the browser (client-side)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return '';
  }
  
  try {
    return localStorage.getItem(STORAGE_KEY_SOURCE_TEXT) || '';
  } catch (e) {
    console.warn('Failed to load source text from localStorage', e);
    return '';
  }
}

/**
 * Calculate exponential backoff delay for retries
 * @param retryCount - Number of retries so far
 * @returns Delay in milliseconds (2s, 4s, 8s, max 15s)
 */
export function getRetryDelay(retryCount: number): number {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 15000; // 15 seconds
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
}
