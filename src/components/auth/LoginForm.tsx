import { useLoginForm } from "./hooks/useLoginForm";
import { AuthFormWrapper } from "./AuthFormWrapper";
import { PasswordInput } from "./PasswordInput";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/services/auth.service";
import { navigationService } from "@/lib/services/navigation.service";
import type { ErrorResponse } from "@/types";

/**
 * Login form component with client-side validation.
 * Handles user authentication through email and password.
 */
export function LoginForm() {
  const { formState, setEmail, setPassword, validateForm, setGeneralError, setFieldError, setIsLoading, resetErrors } =
    useLoginForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    resetErrors(); // Clear any previous errors

    try {
      const successData = await authService.login({
        email: formState.email,
        password: formState.password,
      });

      console.log("Login successful:", successData.user.email);

      // Per Option B from Q5: React handles redirect
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
        } else {
          // General error (invalid credentials, etc.)
          setGeneralError(errorData.error.message);
        }
      } else {
        // Handle network errors or other exceptions
        setGeneralError("Wystąpił błąd. Spróbuj ponownie");
      }

      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormWrapper
      title="Zaloguj się"
      subtitle="Wprowadź swoje dane, aby kontynuować"
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
        data-testid="login-email-input"
        data-testid-error="login-email-error"
      />

      {/* Password Input */}
      <PasswordInput
        id="password"
        label="Hasło"
        value={formState.password}
        onChange={setPassword}
        error={formState.errors.password}
        disabled={formState.isLoading}
        data-testid="login-password-input"
      />

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={formState.isLoading} data-testid="login-submit-button">
        {formState.isLoading ? "Logowanie..." : "Zaloguj się"}
      </Button>

      {/* Link to Registration */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz konta? </span>
        <a href="/register" className="text-primary hover:underline font-medium" data-testid="login-register-link">
          Zarejestruj się
        </a>
      </div>

      {/* Link to Password Recovery - OUT OF MVP SCOPE */}
      {/* <div className="text-center text-sm">
        <a
          href="/recover-password"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Zapomniałeś hasła?
        </a>
      </div> */}
    </AuthFormWrapper>
  );
}
