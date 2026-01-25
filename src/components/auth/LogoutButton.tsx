import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/services/auth.service";
import { navigationService } from "@/lib/services/navigation.service";

interface LogoutButtonProps {
  className?: string;
}

/**
 * LogoutButton component
 * Handles user logout by calling the logout API endpoint
 */
export function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await authService.logout();

      // Redirect to login page after successful logout
      navigationService.redirectToLogin();
    } catch (error) {
      console.error("Logout error:", error);
      alert("Wystąpił błąd podczas wylogowania. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoading} className={className}>
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
