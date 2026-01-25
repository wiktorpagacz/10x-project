import { useState } from "react";
import { recoverPasswordSchema } from "@/lib/validation/auth-schemas";
import type { ZodError } from "zod";

interface RecoverPasswordFormState {
  email: string;
  isLoading: boolean;
  emailError?: string;
  generalError?: string;
  successMessage?: string;
}

interface UseRecoverPasswordFormReturn {
  formState: RecoverPasswordFormState;
  setEmail: (email: string) => void;
  validateForm: () => boolean;
  setGeneralError: (error: string) => void;
  setSuccessMessage: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetErrors: () => void;
}

/**
 * Custom hook for managing password recovery form state and validation.
 * Uses Zod schema for validation as per project guidelines.
 *
 * NOTE: This feature is OUT OF MVP SCOPE per PRD Section 4.2.
 */
export function useRecoverPasswordForm(): UseRecoverPasswordFormReturn {
  const [formState, setFormState] = useState<RecoverPasswordFormState>({
    email: "",
    isLoading: false,
    emailError: undefined,
    generalError: undefined,
    successMessage: undefined,
  });

  const setEmail = (email: string) => {
    setFormState((prev) => ({
      ...prev,
      email,
      emailError: undefined,
      generalError: undefined,
    }));
  };

  const validateForm = (): boolean => {
    try {
      recoverPasswordSchema.parse({ email: formState.email });

      // Clear errors if validation passes
      setFormState((prev) => ({ ...prev, emailError: undefined }));
      return true;
    } catch (error) {
      const zodError = error as ZodError;
      const emailError = zodError.errors[0]?.message;

      setFormState((prev) => ({ ...prev, emailError }));
      return false;
    }
  };

  const setGeneralError = (generalError: string) => {
    setFormState((prev) => ({ ...prev, generalError }));
  };

  const setSuccessMessage = (successMessage: string) => {
    setFormState((prev) => ({ ...prev, successMessage }));
  };

  const setIsLoading = (isLoading: boolean) => {
    setFormState((prev) => ({ ...prev, isLoading }));
  };

  const resetErrors = () => {
    setFormState((prev) => ({
      ...prev,
      emailError: undefined,
      generalError: undefined,
    }));
  };

  return {
    formState,
    setEmail,
    validateForm,
    setGeneralError,
    setSuccessMessage,
    setIsLoading,
    resetErrors,
  };
}
