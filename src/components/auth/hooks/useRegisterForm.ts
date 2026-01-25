import { useState, useCallback } from 'react';

interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
}

interface UseRegisterFormReturn {
  formState: RegisterFormState;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  validateForm: () => boolean;
  setGeneralError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetErrors: () => void;
}

/**
 * Custom hook for managing registration form state and validation.
 */
export function useRegisterForm(): UseRegisterFormReturn {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    isLoading: false,
    errors: {},
  });

  const setEmail = useCallback((email: string) => {
    setFormState((prev) => ({
      ...prev,
      email,
      errors: { ...prev.errors, email: undefined, general: undefined },
    }));
  }, []);

  const setPassword = useCallback((password: string) => {
    setFormState((prev) => ({
      ...prev,
      password,
      errors: { ...prev.errors, password: undefined, general: undefined },
    }));
  }, []);

  const setConfirmPassword = useCallback((confirmPassword: string) => {
    setFormState((prev) => ({
      ...prev,
      confirmPassword,
      errors: { ...prev.errors, confirmPassword: undefined, general: undefined },
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: RegisterFormState['errors'] = {};

    // Email validation
    if (!formState.email) {
      errors.email = 'Email jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errors.email = 'Wprowadź poprawny adres email';
    }

    // Password validation
    if (!formState.password) {
      errors.password = 'Hasło jest wymagane';
    } else if (formState.password.length < 8) {
      errors.password = 'Hasło musi mieć co najmniej 8 znaków';
    }

    // Confirm password validation
    if (!formState.confirmPassword) {
      errors.confirmPassword = 'Potwierdź swoje hasło';
    } else if (formState.password !== formState.confirmPassword) {
      errors.confirmPassword = 'Hasła nie są zgodne';
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [formState.email, formState.password, formState.confirmPassword]);

  const setGeneralError = useCallback((error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, general: error },
    }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setFormState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const resetErrors = useCallback(() => {
    setFormState((prev) => ({ ...prev, errors: {} }));
  }, []);

  return {
    formState,
    setEmail,
    setPassword,
    setConfirmPassword,
    validateForm,
    setGeneralError,
    setIsLoading,
    resetErrors,
  };
}
