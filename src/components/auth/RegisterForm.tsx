import { useRegisterForm } from "./hooks/useRegisterForm";
import { AuthFormWrapper } from "./AuthFormWrapper";
import { PasswordInput } from "./PasswordInput";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/services/auth.service";
import { navigationService } from "@/lib/services/navigation.service";
import type { ErrorResponse } from "@/types";

/**
 * Registration form component with client-side validation.
 * Handles new user account creation with email and password.
 */
export function RegisterForm() {
  const {
    formState,
    setEmail,
    setPassword,
    setConfirmPassword,
    validateForm,
    setGeneralError,
    setFieldError,
    setIsLoading,
    resetErrors,
  } = useRegisterForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    resetErrors(); // Clear any previous errors

    try {
      const successData = await authService.register({
        email: formState.email,
        password: formState.password,
        confirmPassword: formState.confirmPassword,
      });

      console.log("Registration successful:", successData.user.email);

      // Auto-login and redirect to home page per US-001 criterion 3
      navigationService.redirectToHome();
    } catch (error) {
      // Handle ErrorResponse from API
      if (error && typeof error === "object" && "error" in error) {
        const errorData = error as ErrorResponse;

        // Handle field-specific errors
        if (errorData.error.field === "email") {
          setFieldError("email", errorData.error.message);
        } else if (errorData.error.field === "password") {
          setFieldError("password", errorData.error.message);
        } else if (errorData.error.field === "confirmPassword") {
          setFieldError("confirmPassword", errorData.error.message);
        } else {
          // General error (email taken, etc.)
          setGeneralError(errorData.error.message);
        }
      } else {
        // Handle network errors or other exceptions
        setGeneralError("Wystąpił błąd. Spróbuj ponownie");
      }

      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormWrapper
      title="Utwórz konto"
      subtitle="Zacznij generować fiszki już teraz"
      onSubmit={handleSubmit}
      generalError={formState.errors.general}
    >
      {/* Email Input */}
      <FormInput
        id="email"
        label="Email"
        type="email"
        value={formState.email}
        onChange={setEmail}
        error={formState.errors.email}
        placeholder="twoj@email.com"
        disabled={formState.isLoading}
        required
      />

      {/* Password Input */}
      <PasswordInput
        id="password"
        label="Hasło"
        value={formState.password}
        onChange={setPassword}
        error={formState.errors.password}
        disabled={formState.isLoading}
      />

      {/* Confirm Password Input */}
      <PasswordInput
        id="confirmPassword"
        label="Potwierdź hasło"
        value={formState.confirmPassword}
        onChange={setConfirmPassword}
        error={formState.errors.confirmPassword}
        disabled={formState.isLoading}
      />

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={formState.isLoading}>
        {formState.isLoading ? "Tworzenie konta..." : "Zarejestruj się"}
      </Button>

      {/* Link to Login */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a href="/login" className="text-primary hover:underline font-medium">
          Zaloguj się
        </a>
      </div>
    </AuthFormWrapper>
  );
}
