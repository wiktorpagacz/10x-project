import type { ReactNode } from 'react';

interface AuthFormWrapperProps {
  title: string;
  subtitle?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  generalError?: string;
}

/**
 * Common wrapper for authentication forms.
 * Provides consistent structure and error display.
 */
export function AuthFormWrapper({
  title,
  subtitle,
  onSubmit,
  children,
  generalError,
}: AuthFormWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {generalError ? (
        <div
          className="p-3 rounded-md bg-destructive/10 border border-destructive/20"
          role="alert"
          data-testid="auth-general-error"
        >
          <p className="text-sm text-destructive">{generalError}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" data-testid="auth-form" noValidate>
        {children}
      </form>
    </div>
  );
}
