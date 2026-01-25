import { useEffect, useState } from "react";
import {
  InfoBox,
  useInfoBoxInitialState,
  TextInputSection,
  GenerateButton,
  SuggestedFlashcardsReview,
  ConfirmDialog,
  ToastContainer,
  showToast,
  useGenerationViewState,
  useConfirmDialog,
  useCharacterCounter,
} from "@/components/generation";
import type { CreateGenerationCommand, CreateGenerationResponseDto, CreateFlashcardsBatchCommand } from "@/types";
import { isMockModeEnabled, mockGenerationAPI, mockBatchSaveAPI } from "@/lib/mock-generation";

const MIN_CHARS = 1000;
const MAX_CHARS = 10000;

/**
 * Main Generation View component.
 * Orchestrates the entire flashcard generation workflow through a state machine.
 *
 * State flow: idle → generating → reviewing → saving → idle
 *                ↑       ↓           ↓           ↓
 *                └─────error ←───────┴───────────┘
 */
export function GenerationView() {
  // Main state management
  const viewState = useGenerationViewState();

  // Check if mock mode is enabled
  const [mockMode, setMockMode] = useState(false);

  useEffect(() => {
    setMockMode(isMockModeEnabled());
  }, []);

  // InfoBox state (expanded/collapsed)
  const initialInfoBoxState = useInfoBoxInitialState();
  useEffect(() => {
    viewState.setInfoBoxExpanded(initialInfoBoxState);
  }, [initialInfoBoxState]); // Usunięto viewState z dependencies

  // Confirm dialog for navigation blocking
  const confirmDialog = useConfirmDialog();

  // Character counter for validation
  const characterCounter = useCharacterCounter(viewState.sourceText, MAX_CHARS, MIN_CHARS);

  // Enable/disable navigation blocking based on reviewing state
  useEffect(() => {
    if (viewState.status === "reviewing") {
      confirmDialog.enableNavigationBlock();
    } else {
      confirmDialog.disableNavigationBlock();
    }
  }, [viewState.status, confirmDialog]);

  // ========== GENERATION WORKFLOW ========== //

  const handleGenerate = async () => {
    if (!characterCounter.isValid) {
      showToast.error("Please enter between 1,000 and 10,000 characters");
      return;
    }

    viewState.startGeneration();

    try {
      // Wait for retry delay if this is a retry (exponential backoff)
      if (viewState.retryCount > 0) {
        const delay = Math.min(2000 * Math.pow(2, viewState.retryCount), 15000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // ========== MOCK MODE ========== //
      if (mockMode) {
        try {
          const mockData = await mockGenerationAPI(viewState.sourceText);
          viewState.completeGeneration(mockData);
          showToast.success(
            `[MOCK MODE] Successfully generated ${mockData.generated_count} flashcard${mockData.generated_count !== 1 ? "s" : ""}!`
          );
          return;
        } catch (error) {
          // Mock error handling
          const errorMessage = error instanceof Error ? error.message : "Mock generation failed";
          viewState.setGenerationError({
            code: "MOCK_ERROR",
            message: errorMessage,
            retryable: true,
          });

          if (viewState.retryCount < 3) {
            showToast.error(`[MOCK MODE] ${errorMessage}`, {
              onRetry: () => {
                viewState.retryGeneration();
                handleGenerate();
              },
            });
          } else {
            showToast.error(`[MOCK MODE] ${errorMessage}`);
          }
          return;
        }
      }

      // ========== REAL API MODE ========== //
      // Call API
      const command: CreateGenerationCommand = {
        source_text: viewState.sourceText.trim(),
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

        // Handle specific error cases
        if (response.status === 401) {
          viewState.setGenerationError({
            code: "UNAUTHORIZED",
            message: "Your session has expired. Please log in again.",
            retryable: false,
          });
          showToast.error("Session expired. Redirecting to login...");
          setTimeout(() => {
            window.location.assign("/login");
          }, 2000);
          return;
        }

        if (response.status === 400) {
          viewState.setGenerationError({
            code: "BAD_REQUEST",
            message: errorData.error || "Invalid request",
            retryable: false,
          });
          showToast.error(errorData.error || "Invalid request");
          return;
        }

        // Server errors are retryable
        const isRetryable = response.status >= 500;
        viewState.setGenerationError({
          code: errorData.errorCode || "SERVER_ERROR",
          message: errorData.error || "Failed to generate flashcards",
          retryable: isRetryable,
        });

        if (isRetryable && viewState.retryCount < 3) {
          showToast.error(errorData.error || "Failed to generate flashcards", {
            onRetry: () => {
              viewState.retryGeneration();
              handleGenerate();
            },
          });
        } else {
          showToast.error(errorData.error || "Failed to generate flashcards");
        }
        return;
      }

      const data: CreateGenerationResponseDto = await response.json();
      viewState.completeGeneration(data);

      showToast.success(
        `Successfully generated ${data.generated_count} flashcard${data.generated_count !== 1 ? "s" : ""}!`
      );
    } catch (error) {
      // Network errors
      const errorMessage = error instanceof Error ? error.message : "Network error occurred";
      viewState.setGenerationError({
        code: "NETWORK_ERROR",
        message: errorMessage,
        retryable: true,
      });

      if (viewState.retryCount < 3) {
        showToast.error("Network error. Please check your connection.", {
          onRetry: () => {
            viewState.retryGeneration();
            handleGenerate();
          },
        });
      } else {
        showToast.error("Network error. Please try again later.");
      }
    }
  };

  // ========== CARD REVIEW ACTIONS ========== //

  const handleAcceptCard = (index: number) => {
    viewState.acceptCard(index);
  };

  const handleRejectCard = (index: number) => {
    viewState.rejectCard(index);
  };

  const handleAcceptAllCards = () => {
    viewState.acceptAllCards();
  };

  const handleRejectAllCards = () => {
    viewState.rejectAllCards();
  };

  const handleEditCard = (index: number, front: string, back: string) => {
    // Update the card directly with the new values
    viewState.updateEditedCard(front, back, index);
  };

  // ========== BATCH SAVE WORKFLOW ========== //

  const handleSaveToCollection = async () => {
    const acceptedCards = viewState.getAcceptedCards();

    if (acceptedCards.length === 0) {
      showToast.error("Please accept at least one flashcard");
      return;
    }

    if (!viewState.generationId) {
      showToast.error("Generation ID not found. Please try again.");
      return;
    }

    viewState.startSave();

    try {
      // Prepare batch command
      const flashcardsToSave = acceptedCards.map((card) => ({
        front: card.front,
        back: card.back,
        source: card.source, // 'ai-full' or 'ai-edited'
      }));

      // ========== MOCK MODE ========== //
      if (mockMode) {
        try {
          await mockBatchSaveAPI(viewState.generationId, flashcardsToSave);

          showToast.success(
            `[MOCK MODE] Successfully saved ${acceptedCards.length} flashcard${acceptedCards.length !== 1 ? "s" : ""}!`
          );

          // Small delay before navigation for toast visibility
          setTimeout(() => {
            viewState.completeSave();
            // In mock mode, show a message instead of navigating
            showToast.info("[MOCK MODE] In real mode, you would be redirected to /flashcards");
          }, 1000);
          return;
        } catch (error) {
          // Mock error handling
          const errorMessage = error instanceof Error ? error.message : "Failed to save flashcards";
          viewState.setSaveError({
            code: "MOCK_SAVE_ERROR",
            message: errorMessage,
            retryable: true,
          });

          showToast.error(`[MOCK MODE] ${errorMessage}`, {
            onRetry: handleSaveToCollection,
          });
          return;
        }
      }

      // ========== REAL API MODE ========== //
      const command: CreateFlashcardsBatchCommand = {
        generation_id: viewState.generationId,
        flashcards: flashcardsToSave,
      };

      const response = await fetch("/api/flashcards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

        // Handle specific error cases
        if (response.status === 401) {
          viewState.setSaveError({
            code: "UNAUTHORIZED",
            message: "Your session has expired. Please log in again.",
            retryable: false,
          });
          showToast.error("Session expired. Redirecting to login...");
          setTimeout(() => {
            window.location.assign("/login");
          }, 2000);
          return;
        }

        // Other errors
        const isRetryable = response.status >= 500;
        viewState.setSaveError({
          code: errorData.errorCode || "SAVE_ERROR",
          message: errorData.error || "Failed to save flashcards",
          retryable: isRetryable,
        });

        if (isRetryable) {
          showToast.error(errorData.error || "Failed to save flashcards", {
            onRetry: handleSaveToCollection,
          });
        } else {
          showToast.error(errorData.error || "Failed to save flashcards");
        }
        return;
      }

      // Success
      showToast.success(
        `Successfully saved ${acceptedCards.length} flashcard${acceptedCards.length !== 1 ? "s" : ""}!`
      );

      // Small delay before navigation for toast visibility
      setTimeout(() => {
        viewState.completeSave();
        window.location.assign("/flashcards"); // Navigate to flashcards list
      }, 1000);
    } catch (error) {
      // Network errors
      const errorMessage = error instanceof Error ? error.message : "Network error occurred";
      viewState.setSaveError({
        code: "NETWORK_ERROR",
        message: errorMessage,
        retryable: true,
      });

      showToast.error("Network error. Please try again.", {
        onRetry: handleSaveToCollection,
      });
    }
  };

  // ========== NAVIGATION HANDLING ========== //

  const handleNavigationConfirm = () => {
    confirmDialog.confirm();
    confirmDialog.disableNavigationBlock();
    viewState.resetState();
    // Allow browser to navigate
  };

  const handleNavigationCancel = () => {
    confirmDialog.close();
  };

  // ========== RENDER ========== //

  const isGenerating = viewState.status === "generating";
  const isReviewing = viewState.status === "reviewing";
  const isSaving = viewState.status === "saving";
  const isIdle = viewState.status === "idle" || viewState.status === "error";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Toast Container */}
      <ToastContainer />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">Generate Flashcards with AI</h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Transform your study material into effective flashcards instantly
            </p>

            {/* Mock Mode Indicator */}
            {mockMode && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-300 dark:border-amber-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium">MOCK MODE ACTIVE</span>
                <span className="text-sm opacity-80">No AI budget will be used</span>
              </div>
            )}
          </header>

          {/* Info Box */}
          <InfoBox isExpanded={viewState.infoBoxExpanded} onToggle={viewState.setInfoBoxExpanded} />

          {/* Input Section (always visible) */}
          <div className="space-y-6">
            <TextInputSection
              sourceText={viewState.sourceText}
              isGenerating={isGenerating}
              onChangeText={viewState.setSourceText}
              onGenerateClick={handleGenerate}
            />

            {isIdle && (
              <div className="flex justify-center">
                <GenerateButton
                  isDisabled={!characterCounter.isValid}
                  isLoading={isGenerating}
                  onClick={handleGenerate}
                />
              </div>
            )}
          </div>

          {/* Review Section (visible in reviewing and saving states) */}
          {(isReviewing || isSaving) && (
            <SuggestedFlashcardsReview
              cards={viewState.suggestedFlashcards}
              onAcceptCard={handleAcceptCard}
              onRejectCard={handleRejectCard}
              onEditCard={handleEditCard}
              onAcceptAllCards={handleAcceptAllCards}
              onRejectAllCards={handleRejectAllCards}
              onSaveToCollection={handleSaveToCollection}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>

      {/* Navigation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={handleNavigationConfirm}
        onCancel={handleNavigationCancel}
      />
    </div>
  );
}
