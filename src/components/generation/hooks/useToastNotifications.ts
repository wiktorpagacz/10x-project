import { useState, useCallback } from 'react';

interface ToastOptions {
  autoClose?: boolean;
  duration?: number;
  retryable?: boolean;
  onRetry?: () => void;
}

export interface ToastNotification {
  id: string;
  type: 'error' | 'info' | 'success';
  message: string;
  retryable: boolean;
  autoClose: boolean;
  duration: number;
  onRetry?: () => void;
}

/**
 * Hook managing toast queue and auto-dismiss.
 * 
 * @returns Toast state and helper functions
 */
export function useToastNotifications() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: 'error' | 'info' | 'success' = 'info',
      options: ToastOptions = {}
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastNotification = {
        id,
        type,
        message,
        retryable: options.retryable || false,
        autoClose: options.autoClose !== false, // Default true
        duration: options.duration || 5000,
        onRetry: options.onRetry,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss if enabled
      if (toast.autoClose) {
        setTimeout(() => {
          dismissToast(id);
        }, toast.duration);
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showErrorWithRetry = useCallback(
    (message: string, onRetry: () => void) => {
      showToast(message, 'error', {
        retryable: true,
        autoClose: false,
        onRetry,
      });
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    dismissToast,
    showErrorWithRetry,
  };
}
