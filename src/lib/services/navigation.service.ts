/**
 * Navigation service for client-side redirects.
 * Abstracts navigation logic for easier testing and potential future routing changes.
 */

export const navigationService = {
  /**
   * Redirect to home page (generation view).
   */
  redirectToHome(): void {
    window.location.href = "/";
  },

  /**
   * Redirect to login page.
   */
  redirectToLogin(): void {
    window.location.href = "/login";
  },

  /**
   * Redirect to registration page.
   */
  redirectToRegister(): void {
    window.location.href = "/register";
  },

  /**
   * Redirect to password recovery page.
   */
  redirectToRecoverPassword(): void {
    window.location.href = "/recover-password";
  },
};
