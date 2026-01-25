import { useState } from "react";
import { Check, Edit2, X, Save, XCircle as Cancel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FlashcardPreviewCardProps } from "./types";
import { cn } from "@/lib/utils";

const MAX_PREVIEW_LENGTH = 100;
const FRONT_MAX_CHARS = 200;
const BACK_MAX_CHARS = 500;

/**
 * Individual card preview component within the SuggestedFlashcardsReview list.
 * Displays truncated front and back text with action buttons.
 * Supports inline editing mode.
 */
export function FlashcardPreviewCard({ card, cardIndex, onAccept, onEdit, onReject }: FlashcardPreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFront, setEditFront] = useState(card.front);
  const [editBack, setEditBack] = useState(card.back);

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const isAccepted = card.status === "accepted";
  const isPending = card.status === "pending";
  const isRejected = card.status === "rejected";

  // Don't render rejected cards
  if (isRejected) return null;

  const handleEdit = () => {
    setEditFront(card.front);
    setEditBack(card.back);
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validate
    if (editFront.trim().length === 0 || editBack.trim().length === 0) {
      return;
    }
    if (editFront.length > FRONT_MAX_CHARS || editBack.length > BACK_MAX_CHARS) {
      return;
    }

    // Call the edit handler with updated values
    onEdit(cardIndex, editFront.trim(), editBack.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditFront(card.front);
    setEditBack(card.back);
    setIsEditing(false);
  };

  const isValid =
    editFront.trim().length > 0 &&
    editFront.length <= FRONT_MAX_CHARS &&
    editBack.trim().length > 0 &&
    editBack.length <= BACK_MAX_CHARS;

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-4 transition-all",
        isAccepted
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
          : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900",
        "hover:shadow-md"
      )}
    >
      {/* Status Badge */}
      {isAccepted && (
        <div className="absolute -top-2 -right-2 rounded-full bg-green-500 p-1.5 shadow-lg">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Card Content */}
      <div className="space-y-3">
        {isEditing ? (
          // Editing mode
          <>
            {/* Front Field */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Front
              </h4>
              <Textarea
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                placeholder="Enter the question or prompt..."
                className="min-h-[80px] resize-y"
                maxLength={FRONT_MAX_CHARS}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {editFront.length}/{FRONT_MAX_CHARS} characters
              </p>
            </div>

            {/* Back Field */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Back
              </h4>
              <Textarea
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                placeholder="Enter the answer or explanation..."
                className="min-h-[100px] resize-y"
                maxLength={BACK_MAX_CHARS}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {editBack.length}/{BACK_MAX_CHARS} characters
              </p>
            </div>
          </>
        ) : (
          // Display mode
          <>
            {/* Front */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                Front
              </h4>
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                {truncate(card.front, MAX_PREVIEW_LENGTH)}
              </p>
            </div>

            {/* Back */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                Back
              </h4>
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                {truncate(card.back, MAX_PREVIEW_LENGTH)}
              </p>
            </div>

            {/* Edited Indicator */}
            {card.isEdited && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <Edit2 className="h-3 w-3" />
                <span>Edited</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isEditing ? (
        // Editing mode buttons
        <div className="mt-4 flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1">
            <Cancel className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
        </div>
      ) : isPending ? (
        // Pending state buttons
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAccept(cardIndex)}
            className="flex-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Accept
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1">
            <Edit2 className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(cardIndex)}
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <X className="mr-1.5 h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : (
        // Accepted state buttons
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1">
            <Edit2 className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(cardIndex)}
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <X className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
