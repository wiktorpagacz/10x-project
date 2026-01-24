import { useState, useCallback } from 'react';
import type { FlashcardModalState } from '../types';

/**
 * Hook managing FlashcardModal state and validation.
 * 
 * @param initialFront - Initial front value (optional)
 * @param initialBack - Initial back value (optional)
 * @returns Modal state and helper functions
 */
export function useFlashcardModal(
  initialFront = '',
  initialBack = ''
) {
  const [state, setState] = useState<FlashcardModalState>({
    isOpen: false,
    isEditingMode: false,
    front: initialFront,
    back: initialBack,
    errors: {},
  });

  const setFront = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      front: text,
      errors: { ...prev.errors, front: undefined },
    }));
  }, []);

  const setBack = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      back: text,
      errors: { ...prev.errors, back: undefined },
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const errors: FlashcardModalState['errors'] = {};
    let isValid = true;

    // Validate front
    if (state.front.trim().length === 0) {
      errors.front = 'Front side is required.';
      isValid = false;
    } else if (state.front.length > 200) {
      errors.front = 'Front side cannot exceed 200 characters.';
      isValid = false;
    }

    // Validate back
    if (state.back.trim().length === 0) {
      errors.back = 'Back side is required.';
      isValid = false;
    } else if (state.back.length > 500) {
      errors.back = 'Back side cannot exceed 500 characters.';
      isValid = false;
    }

    setState((prev) => ({ ...prev, errors }));
    return isValid;
  }, [state.front, state.back]);

  const reset = useCallback(() => {
    setState({
      isOpen: false,
      isEditingMode: false,
      front: '',
      back: '',
      errors: {},
    });
  }, []);

  const openForCreate = useCallback(() => {
    setState({
      isOpen: true,
      isEditingMode: false,
      front: '',
      back: '',
      errors: {},
    });
  }, []);

  const openForEdit = useCallback((front: string, back: string) => {
    setState({
      isOpen: true,
      isEditingMode: true,
      front,
      back,
      errors: {},
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    state,
    setFront,
    setBack,
    validate,
    reset,
    openForCreate,
    openForEdit,
    close,
  };
}
