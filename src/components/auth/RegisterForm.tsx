import { useRegisterForm } from './hooks/useRegisterForm';
import { AuthFormWrapper } from './AuthFormWrapper';
import { PasswordInput } from './PasswordInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
    setIsLoading,
  } = useRegisterForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: API call will be implemented in backend phase
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: formState.email,
      //     password: formState.password,
      //   }),
      // });

      // if (!response.ok) {
      //   const error = await response.json();
      //   if (error.code === 'EMAIL_EXISTS') {
      //     setGeneralError('Ten adres email jest już zajęty');
      //   } else {
      //     setGeneralError('Wystąpił błąd. Spróbuj ponownie');
      //   }
      //   return;
      // }

      // window.location.href = '/';

      // Temporary mock behavior
      console.log('Registration attempt:', { email: formState.email });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneralError('Backend not yet implemented');
    } catch (error) {
      setGeneralError('Wystąpił błąd. Spróbuj ponownie');
      console.error('Registration error:', error);
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
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className={formState.errors.email ? 'text-destructive' : ''}
        >
          Email <span className="text-destructive">*</span>
        </Label>
        <input
          id="email"
          type="email"
          value={formState.email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="twoj@email.com"
          disabled={formState.isLoading}
          required
          className={`
            w-full px-3 py-2 rounded-md border bg-background
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${formState.errors.email ? 'border-destructive' : 'border-input'}
          `}
          aria-invalid={formState.errors.email ? 'true' : 'false'}
          aria-describedby={formState.errors.email ? 'email-error' : undefined}
        />
        {formState.errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {formState.errors.email}
          </p>
        )}
      </div>

      {/* Password Input */}
      <PasswordInput
        id="password"
        label="Hasło"
        value={formState.password}
        onChange={setPassword}
        error={formState.errors.password}
        disabled={formState.isLoading}
        required
      />

      {/* Confirm Password Input */}
      <PasswordInput
        id="confirmPassword"
        label="Potwierdź hasło"
        value={formState.confirmPassword}
        onChange={setConfirmPassword}
        error={formState.errors.confirmPassword}
        disabled={formState.isLoading}
        required
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={formState.isLoading}
      >
        {formState.isLoading ? 'Tworzenie konta...' : 'Zarejestruj się'}
      </Button>

      {/* Link to Login */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a
          href="/login"
          className="text-primary hover:underline font-medium"
        >
          Zaloguj się
        </a>
      </div>
    </AuthFormWrapper>
  );
}
