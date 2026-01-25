import { useRecoverPasswordForm } from "./hooks/useRecoverPasswordForm";
import { AuthFormWrapper } from "./AuthFormWrapper";
import { RecoverPasswordSuccess } from "./RecoverPasswordSuccess";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";

/**
 * Password recovery form component.
 *
 * NOTE: This component is OUT OF MVP SCOPE per PRD Section 4.2.
 * It is implemented for architectural completeness and future use.
 * Password recovery for forgotten passwords is not part of the MVP.
 */
export function RecoverPasswordForm() {
  const { formState, setEmail, validateForm, setGeneralError, setSuccessMessage, setIsLoading, resetErrors } =
    useRecoverPasswordForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    resetErrors();

    try {
      // TODO: This feature is OUT OF MVP SCOPE
      // Future implementation will use:
      // await authService.recoverPassword(formState.email);
      // setSuccessMessage('Link do resetowania hasła został wysłany na Twój email');

      // Temporary mock behavior
      console.log("Password recovery attempt:", { email: formState.email });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneralError("Ta funkcja nie jest jeszcze dostępna (poza MVP)");
    } catch (error) {
      setGeneralError("Wystąpił błąd. Spróbuj ponownie");
      console.error("Password recovery error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message if available
  if (formState.successMessage) {
    return <RecoverPasswordSuccess message={formState.successMessage} />;
  }

  return (
    <AuthFormWrapper
      title="Odzyskaj hasło"
      subtitle="Wprowadź swój email, aby zresetować hasło"
      onSubmit={handleSubmit}
      generalError={formState.generalError}
    >
      {/* Email Input */}
      <FormInput
        id="email"
        label="Email"
        type="email"
        value={formState.email}
        onChange={setEmail}
        error={formState.emailError}
        placeholder="twoj@email.com"
        disabled={formState.isLoading}
        required
      />

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={formState.isLoading}>
        {formState.isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
      </Button>

      {/* Link to Login */}
      <div className="text-center text-sm">
        <a href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
          Powrót do logowania
        </a>
      </div>
    </AuthFormWrapper>
  );
}
