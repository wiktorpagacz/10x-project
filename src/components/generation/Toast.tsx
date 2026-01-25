import { toast as sonnerToast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/**
 * Toast container component from Shadcn/ui that should be placed at the root of the app.
 * Handles positioning and rendering of all toasts.
 */
export function ToastContainer() {
  return <Toaster position="bottom-right" expand={false} richColors closeButton />;
}

/**
 * Imperative toast API for showing notifications from anywhere.
 * Uses Sonner library through Shadcn/ui component.
 *
 * @example
 * showToast.error('Generation failed', { onRetry: () => retryGeneration() })
 * showToast.success('Flashcards saved!')
 * showToast.info('Processing...')
 */
export const showToast = {
  error: (message: string, options?: { onRetry?: () => void }) => {
    return sonnerToast.error(message, {
      duration: options?.onRetry ? Infinity : 5000,
      action: options?.onRetry
        ? {
            label: "Retry",
            onClick: options.onRetry,
          }
        : undefined,
    });
  },

  success: (message: string, duration = 5000) => {
    return sonnerToast.success(message, {
      duration,
    });
  },

  info: (message: string, duration = 5000) => {
    return sonnerToast.info(message, {
      duration,
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};
