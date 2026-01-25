import { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "./CharacterCounter";
import { useCharacterCounter } from "./hooks/useCharacterCounter";
import type { FlashcardModalProps } from "./types";
import { cn } from "@/lib/utils";

const FRONT_MAX_CHARS = 200;
const BACK_MAX_CHARS = 500;

/**
 * Reusable modal dialog for creating and editing flashcards.
 * Used for editing AI suggestions during review and manual flashcard creation.
 * Enforces character limits with real-time feedback and validates required fields.
 */
export function FlashcardModal({
  isOpen,
  isEditingMode,
  front,
  back,
  errors,
  onChangeFront,
  onChangeBack,
  onSave,
  onCancel,
}: FlashcardModalProps) {
  const frontId = useId();
  const backId = useId();

  // Character counters for both fields
  const frontCounter = useCharacterCounter(front, FRONT_MAX_CHARS);
  const backCounter = useCharacterCounter(back, BACK_MAX_CHARS);

  // Form is valid when both fields are not empty and within limits
  const isValid =
    front.trim().length > 0 &&
    front.length <= FRONT_MAX_CHARS &&
    back.trim().length > 0 &&
    back.length <= BACK_MAX_CHARS &&
    !errors.front &&
    !errors.back;

  const handleSave = () => {
    if (isValid) {
      onSave();
    }
  };

  // Handle Enter key in textareas (Ctrl+Enter to save)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && isValid) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{isEditingMode ? "Edit Flashcard" : "Create New Flashcard"}</DialogTitle>
          <DialogDescription>
            {isEditingMode
              ? "Make changes to the flashcard below. Your edits will be saved when you click Save."
              : "Fill in both sides of the flashcard. Front should be a question or prompt, back should be the answer or explanation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Front Field */}
          <div className="space-y-2">
            <Label htmlFor={frontId}>
              Front Side <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id={frontId}
              value={front}
              onChange={(e) => onChangeFront(e.target.value)}
              placeholder="Enter the question or prompt..."
              className={cn("min-h-[100px] resize-y", errors.front && "border-red-500 focus-visible:ring-red-500")}
              aria-invalid={!!errors.front}
              aria-describedby={errors.front ? `${frontId}-error` : undefined}
              maxLength={FRONT_MAX_CHARS}
            />

            <div className="flex items-center justify-between">
              <CharacterCounter current={frontCounter.current} max={FRONT_MAX_CHARS} threshold={70} label="Front" />
            </div>

            {errors.front && (
              <p id={`${frontId}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.front}
              </p>
            )}
          </div>

          {/* Back Field */}
          <div className="space-y-2">
            <Label htmlFor={backId}>
              Back Side <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id={backId}
              value={back}
              onChange={(e) => onChangeBack(e.target.value)}
              placeholder="Enter the answer or explanation..."
              className={cn("min-h-[120px] resize-y", errors.back && "border-red-500 focus-visible:ring-red-500")}
              aria-invalid={!!errors.back}
              aria-describedby={errors.back ? `${backId}-error` : undefined}
              maxLength={BACK_MAX_CHARS}
            />

            <div className="flex items-center justify-between">
              <CharacterCounter current={backCounter.current} max={BACK_MAX_CHARS} threshold={70} label="Back" />
            </div>

            {errors.back && (
              <p id={`${backId}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.back}
              </p>
            )}
          </div>

          {/* Helper Text */}
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            <p>💡 Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to save quickly.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid} type="button">
            Save Flashcard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
