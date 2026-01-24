import { useEffect } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { InfoBoxProps } from './types';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'generation-view-infobox-expanded';

/**
 * Collapsible informational component displaying instructions and character limit details.
 * Persists expanded state to localStorage for improved UX.
 */
export function InfoBox({ isExpanded, onToggle }: InfoBoxProps) {
  // Persist to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isExpanded));
  }, [isExpanded]);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggle}
      className="w-full rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            How to Generate Flashcards
          </h3>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-blue-600 dark:text-blue-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-2">
        <div className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
          <p>
            Paste or type your study material in the text area below. Our AI will
            analyze your content and generate flashcards automatically.
          </p>

          <div className="space-y-2">
            <h4 className="font-semibold">Requirements:</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Minimum:</strong> 1,000 characters (approximately 150-200 words)
              </li>
              <li>
                <strong>Maximum:</strong> 10,000 characters (approximately 1,500-2,000 words)
              </li>
              <li>Content should be educational material, notes, or study content</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Tips for best results:</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use clear, well-structured content</li>
              <li>Include key concepts, definitions, and explanations</li>
              <li>Remove unnecessary formatting or special characters</li>
              <li>Review and edit generated flashcards before saving</li>
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Helper hook to initialize InfoBox expanded state from localStorage.
 * Returns initial state based on localStorage or defaults to true for new users.
 */
export function useInfoBoxInitialState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // New user - expand by default
      return true;
    }
    return JSON.parse(stored);
  } catch {
    // Error reading localStorage - default to expanded
    return true;
  }
}
