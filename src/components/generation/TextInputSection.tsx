import { useId } from "react";
import type { TextInputSectionProps } from "./types";
import { CharacterCounter } from "./CharacterCounter";
import { ProgressBar } from "./ProgressBar";
import { useCharacterCounter } from "./hooks/useCharacterCounter";
import { cn } from "@/lib/utils";

const MIN_CHARS = 1000;
const MAX_CHARS = 10000;

/**
 * Composite component managing text input for AI generation.
 * Provides textarea with character limit enforcement, real-time counter,
 * progress bar visualization, and validation feedback.
 */
export function TextInputSection({ sourceText, isGenerating, onChangeText }: TextInputSectionProps) {
  const textareaId = useId();

  // Get character counter state with min/max validation
  const characterCounter = useCharacterCounter(sourceText, MAX_CHARS, MIN_CHARS);

  const isValid = characterCounter.isValid;
  const isEmpty = sourceText.trim().length === 0;

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <div className="space-y-2">
        <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Study Material
        </label>
        <textarea
          id={textareaId}
          value={sourceText}
          onChange={(e) => onChangeText(e.target.value)}
          disabled={isGenerating}
          placeholder="Paste your study material here... (1,000-10,000 characters)"
          className={cn(
            "w-full min-h-[300px] px-4 py-3 rounded-lg border resize-y",
            "text-neutral-900 dark:text-neutral-100",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors",
            isValid
              ? "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20"
          )}
          aria-invalid={!isValid}
          aria-describedby={`${textareaId}-counter ${textareaId}-progress`}
        />
      </div>

      {/* Character Counter */}
      <div id={`${textareaId}-counter`}>
        <CharacterCounter current={characterCounter.current} max={MAX_CHARS} min={MIN_CHARS} threshold={70} />
      </div>

      {/* Progress Bar */}
      <div id={`${textareaId}-progress`}>
        <ProgressBar current={characterCounter.current} min={MIN_CHARS} max={MAX_CHARS} />
      </div>

      {/* Validation Warning Messages */}
      {!isValid && !isEmpty && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400" role="alert">
          <span className="font-medium">⚠</span>
          <p>
            {characterCounter.current < MIN_CHARS
              ? `Text must be at least ${MIN_CHARS.toLocaleString()} characters. You need ${(MIN_CHARS - characterCounter.current).toLocaleString()} more characters.`
              : `Text cannot exceed ${MAX_CHARS.toLocaleString()} characters. Please remove ${(characterCounter.current - MAX_CHARS).toLocaleString()} characters.`}
          </p>
        </div>
      )}

      {isEmpty && (
        <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <span>ℹ️</span>
          <p>Enter your study material to generate flashcards.</p>
        </div>
      )}
    </div>
  );
}
