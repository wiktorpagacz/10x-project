import { useLoginForm } from './hooks/useLoginForm';
import { AuthFormWrapper } from './AuthFormWrapper';
import { PasswordInput } from './PasswordInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Login form component with client-side validation.
 * Handles user authentication through email and password.
 */
export function LoginForm() {
  const {
    formState,
    setEmail,
    setPassword,
    validateForm,
    setGeneralError,
    setIsLoading,
  } = useLoginForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: API call will be implemented in backend phase
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: formState.email,
      //     password: formState.password,
      //   }),
      // });

      // if (!response.ok) {
      //   const error = await response.json();
      //   setGeneralError('Nieprawidłowy login lub hasło');
      //   return;
      // }

      // window.location.href = '/';

      // Temporary mock behavior
      console.log('Login attempt:', { email: formState.email });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneralError('Backend not yet implemented');
    } catch (error) {
      setGeneralError('Wystąpił błąd. Spróbuj ponownie');
      console.error('Login error:', error);
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

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={formState.isLoading}
      >
        {formState.isLoading ? 'Logowanie...' : 'Zaloguj się'}
      </Button>

      {/* Link to Registration */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz konta? </span>
        <a
          href="/register"
          className="text-primary hover:underline font-medium"
        >
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
