import { useState, useCallback } from 'react';
import { AuthFormWrapper } from './AuthFormWrapper';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Password recovery form component.
 * 
 * NOTE: This component is OUT OF MVP SCOPE per PRD Section 4.2.
 * It is implemented for architectural completeness and future use.
 * Password recovery for forgotten passwords is not part of the MVP.
 */
export function RecoverPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [generalError, setGeneralError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  const validateEmail = useCallback((): boolean => {
    if (!email) {
      setEmailError('Email jest wymagany');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Wprowadź poprawny adres email');
      return false;
    }
    return true;
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset messages
    setEmailError(undefined);
    setGeneralError(undefined);
    setSuccessMessage(undefined);

    // Client-side validation
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: This feature is OUT OF MVP SCOPE
      // Future implementation will use:
      // const response = await fetch('/api/auth/recover-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      // if (!response.ok) {
      //   setGeneralError('Wystąpił błąd. Spróbuj ponownie');
      //   return;
      // }

      // setSuccessMessage(
      //   'Link do resetowania hasła został wysłany na Twój email'
      // );

      // Temporary mock behavior
      console.log('Password recovery attempt:', { email });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneralError('Ta funkcja nie jest jeszcze dostępna (poza MVP)');
    } catch (error) {
      setGeneralError('Wystąpił błąd. Spróbuj ponownie');
      console.error('Password recovery error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {successMessage ? (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Email wysłany
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {successMessage}
              </p>
            </div>
          </div>

          <Button
            onClick={() => (window.location.href = '/login')}
            className="w-full"
          >
            Powrót do logowania
          </Button>
        </div>
      ) : (
        <AuthFormWrapper
          title="Odzyskaj hasło"
          subtitle="Wprowadź swój email, aby zresetować hasło"
          onSubmit={handleSubmit}
          generalError={generalError}
        >
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className={emailError ? 'text-destructive' : ''}>
              Email <span className="text-destructive">*</span>
            </Label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
                setGeneralError(undefined);
              }}
              placeholder="twoj@email.com"
              disabled={isLoading}
              required
              className={`
                w-full px-3 py-2 rounded-md border bg-background
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                disabled:cursor-not-allowed disabled:opacity-50
                ${emailError ? 'border-destructive' : 'border-input'}
              `}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive" role="alert">
                {emailError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
          </Button>

          {/* Link to Login */}
          <div className="text-center text-sm">
            <a
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Powrót do logowania
            </a>
          </div>
        </AuthFormWrapper>
      )}
    </>
  );
}
