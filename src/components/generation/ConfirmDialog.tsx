import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ConfirmDialogProps } from './types';

/**
 * Modal confirmation dialog preventing accidental navigation during review state.
 * Displays a confirmation message before allowing user to leave with unsaved changes.
 */
export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have flashcards that haven't been saved to your collection yet.
            If you leave now, your changes will be lost. Are you sure you want
            to discard these flashcards?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Keep Reviewing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            Discard and Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
