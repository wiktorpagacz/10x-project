import type { CharacterCounterProps } from './types';
import { cn } from '@/lib/utils';

/**
 * Reusable component displaying current character count vs. maximum with color-coded status.
 * Used in TextInputSection and FlashcardModal for character limit feedback.
 */
export function CharacterCounter({
  current,
  max,
  min,
  threshold = 70,
  label,
}: CharacterCounterProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  // Determine status
  let status: 'valid' | 'warning' | 'error' = 'valid';
  
  if (current > max || (min !== undefined && current < min)) {
    status = 'error';
  } else if (percentage >= threshold) {
    status = 'warning';
  }
  
  // Color classes based on status
  const colorClass = {
    valid: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  }[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-neutral-600 dark:text-neutral-400">{label}:</span>}
      <span className={cn('font-medium transition-colors', colorClass)}>
        {current.toLocaleString()} / {max.toLocaleString()}
      </span>
      <span className="text-neutral-500 dark:text-neutral-500">characters</span>
      {min !== undefined && current < min && (
        <span className={cn('text-xs', colorClass)}>
          (min: {min.toLocaleString()})
        </span>
      )}
    </div>
  );
}
