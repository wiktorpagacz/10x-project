import type { OpenRouterErrorCode } from "./openrouter.types";

/**
 * Error thrown when OpenRouter API operations fail.
 * Provides detailed information about the failure including status code,
 * semantic error code, and additional context.
 */
export class OpenRouterError extends Error {
  /**
   * HTTP status code associated with the error
   */
  public readonly statusCode: number;

  /**
   * Semantic error code for programmatic error handling
   */
  public readonly errorCode: OpenRouterErrorCode;

  /**
   * Additional error details and context
   */
  public readonly details?: Record<string, unknown>;

  /**
   * Creates a new OpenRouterError
   *
   * @param statusCode - HTTP status code
   * @param errorCode - Semantic error code
   * @param message - Human-readable error message
   * @param details - Additional error context
   */
  constructor(statusCode: number, errorCode: OpenRouterErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "OpenRouterError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }

  /**
   * Determines if this error represents a retryable failure
   *
   * @returns true if the operation can be safely retried
   */
  public isRetryable(): boolean {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableErrorCodes: OpenRouterErrorCode[] = [
      "TIMEOUT_ERROR",
      "RATE_LIMIT_EXCEEDED",
      "SERVER_ERROR",
      "SERVICE_UNAVAILABLE",
      "NETWORK_ERROR",
    ];

    return retryableStatusCodes.includes(this.statusCode) || retryableErrorCodes.includes(this.errorCode);
  }

  /**
   * Converts error to JSON-serializable object
   *
   * @returns Plain object representation of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      isRetryable: this.isRetryable(),
    };
  }

  /**
   * Gets a user-friendly error message suitable for display
   * Hides internal implementation details
   *
   * @returns User-friendly error message
   */
  public getUserMessage(): string {
    const userMessages: Record<OpenRouterErrorCode, string> = {
      MISSING_API_KEY: "Service configuration error. Please contact support.",
      INVALID_REQUEST: "Invalid request. Please check your input.",
      AUTHENTICATION_ERROR: "Authentication failed. Please try again.",
      INSUFFICIENT_CREDITS: "Insufficient credits. Please check your account.",
      NOT_FOUND: "The requested resource was not found.",
      RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
      SERVER_ERROR: "Server error occurred. Please try again.",
      SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again later.",
      TIMEOUT_ERROR: "Request timed out. Please try again.",
      NETWORK_ERROR: "Network error occurred. Please check your connection.",
      PARSE_ERROR: "Failed to process response. Please try again.",
      VALIDATION_ERROR: "Response validation failed. Please try again.",
      API_ERROR: "An unexpected error occurred. Please try again.",
    };

    return userMessages[this.errorCode] || "An unexpected error occurred.";
  }
}
