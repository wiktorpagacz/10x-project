/**
 * Configuration options for OpenRouter Service
 */
export interface OpenRouterServiceConfig {
  /**
   * OpenRouter API key. If not provided, will attempt to read from environment variable.
   */
  apiKey?: string;

  /**
   * Base URL for OpenRouter API. Defaults to 'https://openrouter.ai/api/v1'
   */
  baseUrl?: string;

  /**
   * Default model to use for chat completions.
   * Example: 'openai/gpt-3.5-turbo', 'anthropic/claude-3-opus'
   */
  defaultModel?: string;

  /**
   * Default temperature for generation (0-2). Controls randomness.
   * Lower values = more deterministic, Higher values = more creative
   */
  defaultTemperature?: number;

  /**
   * Default maximum tokens to generate in completion.
   */
  defaultMaxTokens?: number;

  /**
   * Request timeout in milliseconds. Defaults to 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * HTTP Referer header for request tracking (optional)
   * Example: 'https://yourapp.com'
   */
  httpReferer?: string;

  /**
   * Application title for request tracking (optional)
   */
  appTitle?: string;
}

/**
 * Represents a message in the chat conversation
 */
export interface ChatMessage {
  /**
   * Role of the message sender
   */
  role: "system" | "user" | "assistant";

  /**
   * Content of the message
   */
  content: string;
}

/**
 * JSON Schema definition for structured responses
 */
export interface JsonSchema {
  /**
   * Name of the schema
   */
  name: string;

  /**
   * Whether to use strict mode for schema validation
   */
  strict?: boolean;

  /**
   * JSON Schema object defining the expected structure
   */
  schema: {
    type: "object" | "array";
    properties?: Record<string, unknown>;
    items?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Response format configuration
 */
export interface ResponseFormat {
  /**
   * Type of response format
   */
  type: "json_schema";

  /**
   * JSON Schema definition
   */
  json_schema: JsonSchema;
}

/**
 * Request parameters for chat completion
 */
export interface ChatCompletionRequest {
  /**
   * Model to use for completion. If not provided, uses defaultModel from config.
   */
  model?: string;

  /**
   * Array of messages in the conversation
   */
  messages: ChatMessage[];

  /**
   * Temperature for generation (0-2)
   */
  temperature?: number;

  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;

  /**
   * Top-p sampling parameter (0-1)
   */
  topP?: number;

  /**
   * Frequency penalty (-2 to 2)
   */
  frequencyPenalty?: number;

  /**
   * Presence penalty (-2 to 2)
   */
  presencePenalty?: number;

  /**
   * Response format for structured outputs
   */
  responseFormat?: ResponseFormat;

  /**
   * Stop sequences to end generation
   */
  stop?: string | string[];
}

/**
 * Internal API response structure from OpenRouter
 */
export interface OpenRouterApiResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Options for flashcard generation
 */
export interface FlashcardGenerationOptions {
  /**
   * Model to use for generation
   */
  model?: string;

  /**
   * Minimum number of flashcards to generate
   */
  minFlashcards?: number;

  /**
   * Maximum number of flashcards to generate
   */
  maxFlashcards?: number;

  /**
   * Temperature for generation
   */
  temperature?: number;
}

/**
 * Generated flashcard structure
 */
export interface GeneratedFlashcard {
  /**
   * Question or prompt (front of card)
   */
  front: string;

  /**
   * Answer or explanation (back of card)
   */
  back: string;
}

/**
 * Error codes for OpenRouter operations
 */
export type OpenRouterErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_ERROR"
  | "INSUFFICIENT_CREDITS"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "API_ERROR";
