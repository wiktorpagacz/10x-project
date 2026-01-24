import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GenerateButtonProps } from './types';

/**
 * Primary call-to-action button that initiates the flashcard generation workflow.
 * Shows loading state during API call and is disabled when validation fails.
 */
export function GenerateButton({
  isDisabled,
  isLoading,
  onClick,
}: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isDisabled || isLoading}
      size="lg"
      className="w-full sm:w-auto min-w-[200px]"
      aria-label={isLoading ? 'Generating flashcards...' : 'Generate flashcards'}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Flashcards
        </>
      )}
    </Button>
  );
}
