import { useMemo } from "react";
import { Save, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashcardPreviewCard } from "./FlashcardPreviewCard";
import type { SuggestedFlashcardsReviewProps } from "./types";
import { cn } from "@/lib/utils";

/**
 * Composite component displaying and managing the curation workflow for AI-generated flashcard suggestions.
 * Shows list of card previews, allows per-card actions, displays progress, and coordinates batch saving.
 */
export function SuggestedFlashcardsReview({
  cards,
  onAcceptCard,
  onRejectCard,
  onEditCard,
  onAcceptAllCards,
  onRejectAllCards,
  onSaveToCollection,
  isSaving,
}: SuggestedFlashcardsReviewProps) {
  // Calculate summary statistics
  const { acceptedCount, rejectedCount, pendingCount, visibleCards } = useMemo(() => {
    const accepted = cards.filter((c) => c.status === "accepted").length;
    const rejected = cards.filter((c) => c.status === "rejected").length;
    const pending = cards.filter((c) => c.status === "pending").length;
    const visible = cards.filter((c) => c.status !== "rejected");

    return {
      acceptedCount: accepted,
      rejectedCount: rejected,
      pendingCount: pending,
      visibleCards: visible,
    };
  }, [cards]);

  const canSave = acceptedCount > 0 && !isSaving;
  const allRejected = visibleCards.length === 0;
  const hasPendingCards = pendingCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Review and Accept Flashcards</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Review the AI-generated flashcards below. Accept, edit, or reject each card.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm">
          {acceptedCount > 0 && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">{acceptedCount} to save</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <div className="h-2 w-2 rounded-full bg-neutral-400" />
              <span>{pendingCount} pending</span>
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>{rejectedCount} rejected</span>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Buttons */}
      {hasPendingCards && (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onAcceptAllCards}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Accept All
          </Button>
          <Button
            onClick={onRejectAllCards}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject All
          </Button>
        </div>
      )}

      {/* All Rejected Message */}
      {allRejected && (
        <div
          className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950/20"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">No flashcards selected</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              Accept at least one card to save to your collection.
            </p>
          </div>
        </div>
      )}

      {/* Flashcard Grid */}
      {!allRejected && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, index) => (
            <FlashcardPreviewCard
              key={card.id}
              card={card}
              cardIndex={index}
              onAccept={onAcceptCard}
              onEdit={onEditCard}
              onReject={onRejectCard}
            />
          ))}
        </div>
      )}

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button
          onClick={onSaveToCollection}
          disabled={!canSave}
          size="lg"
          className={cn(
            "flex-1 sm:flex-initial min-w-[240px]",
            canSave && "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save {acceptedCount > 0 ? `${acceptedCount} ` : ""}to Collection
            </>
          )}
        </Button>

        {!canSave && !allRejected && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Accept at least one flashcard to save to your collection.
          </p>
        )}
      </div>
    </div>
  );
}
