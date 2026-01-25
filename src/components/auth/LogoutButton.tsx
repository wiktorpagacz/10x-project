import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Logout error:", error);
        alert("Wystąpił błąd podczas wylogowania. Spróbuj ponownie.");
        return;
      }

      // Redirect to login page after successful logout
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Wystąpił błąd podczas wylogowania. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
