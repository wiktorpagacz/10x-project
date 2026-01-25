import { useState, useCallback, useEffect } from "react";

/**
 * Hook for preventing navigation during review state.
 * Integrates with browser beforeunload event.
 *
 * @returns Confirm dialog state and control functions
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldBlockNavigation, setShouldBlockNavigation] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const confirm = useCallback(() => {
    setShouldBlockNavigation(false);
    setIsOpen(false);
  }, []);

  const enableNavigationBlock = useCallback(() => {
    setShouldBlockNavigation(true);
  }, []);

  const disableNavigationBlock = useCallback(() => {
    setShouldBlockNavigation(false);
  }, []);

  // Handle browser beforeunload event
  useEffect(() => {
    if (!shouldBlockNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlockNavigation]);

  return {
    isOpen,
    open,
    close,
    confirm,
    enableNavigationBlock,
    disableNavigationBlock,
  };
}
