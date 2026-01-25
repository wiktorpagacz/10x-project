import { Button } from "@/components/ui/button";
import { navigationService } from "@/lib/services/navigation.service";

interface RecoverPasswordSuccessProps {
  message: string;
}

/**
 * Success state component for password recovery.
 * Displayed after password recovery email is sent.
 *
 * NOTE: This feature is OUT OF MVP SCOPE per PRD Section 4.2.
 */
export function RecoverPasswordSuccess({ message }: RecoverPasswordSuccessProps) {
  return (
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
          <h2 className="text-2xl font-semibold text-foreground">Email wysłany</h2>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        </div>
      </div>

      <Button onClick={() => navigationService.redirectToLogin()} className="w-full">
        Powrót do logowania
      </Button>
    </div>
  );
}
