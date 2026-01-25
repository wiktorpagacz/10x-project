import { useState } from "react";
import { loginSchema } from "@/lib/validation/auth-schemas";
import type { ZodError } from "zod";

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
  setFieldError: (field: "email" | "password", error: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetErrors: () => void;
}

/**
 * Custom hook for managing login form state and validation.
 * Uses Zod schema for validation as per project guidelines.
 */
export function useLoginForm(): UseLoginFormReturn {
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    isLoading: false,
    errors: {},
  });

  const setEmail = (email: string) => {
    setFormState((prev) => ({
      ...prev,
      email,
      errors: { ...prev.errors, email: undefined, general: undefined },
    }));
  };

  const setPassword = (password: string) => {
    setFormState((prev) => ({
      ...prev,
      password,
      errors: { ...prev.errors, password: undefined, general: undefined },
    }));
  };

  const validateForm = (): boolean => {
    try {
      loginSchema.parse({
        email: formState.email,
        password: formState.password,
      });

      // Clear errors if validation passes
      setFormState((prev) => ({ ...prev, errors: {} }));
      return true;
    } catch (error) {
      const zodError = error as ZodError;
      const errors: LoginFormState["errors"] = {};

      zodError.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password";
        errors[field] = err.message;
      });

      setFormState((prev) => ({ ...prev, errors }));
      return false;
    }
  };

  const setGeneralError = (error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, general: error },
    }));
  };

  const setFieldError = (field: "email" | "password", error: string) => {
    setFormState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  };

  const setIsLoading = (loading: boolean) => {
    setFormState((prev) => ({ ...prev, isLoading: loading }));
  };

  const resetErrors = () => {
    setFormState((prev) => ({ ...prev, errors: {} }));
  };

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
