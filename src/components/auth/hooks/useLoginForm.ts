import { useState, useCallback } from 'react';

interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}

interface UseLoginFormReturn {
  formState: LoginFormState;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  validateForm: () => boolean;
  setGeneralError: (error: string) => void;
  setFieldError: (field: 'email' | 'password', error: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetErrors: () => void;
}

/**
 * Custom hook for managing login form state and validation.
 */
export function useLoginForm(): UseLoginFormReturn {
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
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

  const validateForm = useCallback((): boolean => {
    const errors: LoginFormState['errors'] = {};

    // Email validation
    if (!formState.email) {
      errors.email = 'Email jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errors.email = 'Wprowadź poprawny adres email';
    }

    // Password validation
    if (!formState.password) {
      errors.password = 'Hasło jest wymagane';
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [formState.email, formState.password]);

  const setGeneralError = useCallback((error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, general: error },
    }));
  }, []);

  const setFieldError = useCallback((field: 'email' | 'password', error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
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
    validateForm,
    setGeneralError,
    setFieldError,
    setIsLoading,
    resetErrors,
  };
}
