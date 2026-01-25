import { useState } from "react";
import { registerSchema } from "@/lib/validation/auth-schemas";
import type { ZodError } from "zod";

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
  setFieldError: (field: "email" | "password" | "confirmPassword", error: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetErrors: () => void;
}

/**
 * Custom hook for managing registration form state and validation.
 * Uses Zod schema for validation as per project guidelines.
 */
export function useRegisterForm(): UseRegisterFormReturn {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
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

  const setConfirmPassword = (confirmPassword: string) => {
    setFormState((prev) => ({
      ...prev,
      confirmPassword,
      errors: { ...prev.errors, confirmPassword: undefined, general: undefined },
    }));
  };

  const validateForm = (): boolean => {
    try {
      registerSchema.parse({
        email: formState.email,
        password: formState.password,
        confirmPassword: formState.confirmPassword,
      });

      // Clear errors if validation passes
      setFormState((prev) => ({ ...prev, errors: {} }));
      return true;
    } catch (error) {
      const zodError = error as ZodError;
      const errors: RegisterFormState["errors"] = {};

      zodError.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password" | "confirmPassword";
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

  const setFieldError = (field: "email" | "password" | "confirmPassword", error: string) => {
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
    setConfirmPassword,
    validateForm,
    setGeneralError,
    setFieldError,
    setIsLoading,
    resetErrors,
  };
}
