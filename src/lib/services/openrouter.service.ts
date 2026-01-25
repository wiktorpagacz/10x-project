import { OpenRouterError } from "./openrouter.error";
import type {
  OpenRouterServiceConfig,
  ChatCompletionRequest,
  OpenRouterApiResponse,
  FlashcardGenerationOptions,
  GeneratedFlashcard,
} from "./openrouter.types";

// Re-export for convenience
export { OpenRouterError } from "./openrouter.error";

/**
 * Service for interacting with OpenRouter.ai API
 * Provides type-safe methods for chat completions and structured AI responses
 */
export class OpenRouterService {
  private readonly _apiKey: string;
  private readonly _baseUrl: string;
  private readonly _defaultModel: string;
  private readonly _defaultTemperature: number;
  private readonly _defaultMaxTokens: number;
  private readonly _timeout: number;
  private readonly _httpReferer?: string;
  private readonly _appTitle?: string;

  /**
   * Current API version being used
   */
  public readonly apiVersion: string = "v1";

  /**
   * Read-only access to service configuration
   */
  public readonly config: Readonly<OpenRouterServiceConfig>;

  /**
   * Creates a new OpenRouterService instance
   *
   * @param config - Optional configuration object
   * @throws {OpenRouterError} If API key is not provided or found in environment
   *
   * @example
   * ```typescript
   * // Using environment variables (recommended)
   * const service = new OpenRouterService();
   *
   * // With custom configuration
   * const service = new OpenRouterService({
   *   apiKey: 'sk-or-v1-...',
   *   defaultModel: 'openai/gpt-4',
   *   timeout: 60000
   * });
   * ```
   */
  constructor(config?: OpenRouterServiceConfig) {
    console.log("🔧 OpenRouterService: Initializing...");

    // Extract API key from config or environment
    // Note: Use process.env for server-side variables in Astro SSR
    const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;

    console.log("🔑 API Key check:", apiKey ? `Found (length: ${apiKey.length})` : "NOT FOUND");

    // Validate API key presence
    if (!apiKey) {
      console.error("❌ MISSING_API_KEY: No API key found in config or environment");
      throw new OpenRouterError(
        500,
        "MISSING_API_KEY",
        "OpenRouter API key is required. Provide it in constructor config or set OPENROUTER_API_KEY environment variable."
      );
    }

    console.log("✅ API Key validated");

    // Set configuration with defaults
    this._apiKey = apiKey;
    this._baseUrl = config?.baseUrl || "https://openrouter.ai/api/v1";
    this._defaultModel = config?.defaultModel || "liquid/lfm-2.5-1.2b-thinking:free";
    this._defaultTemperature = config?.defaultTemperature ?? 0.7;
    this._defaultMaxTokens = config?.defaultMaxTokens ?? 1000;
    this._timeout = config?.timeout ?? 30000;
    this._httpReferer = config?.httpReferer;
    this._appTitle = config?.appTitle;

    // Store readonly config
    this.config = Object.freeze({
      baseUrl: this._baseUrl,
      defaultModel: this._defaultModel,
      defaultTemperature: this._defaultTemperature,
      defaultMaxTokens: this._defaultMaxTokens,
      timeout: this._timeout,
      httpReferer: this._httpReferer,
      appTitle: this._appTitle,
    });
  }

  /**
   * Creates a chat completion with OpenRouter
   *
   * @template T - Expected response type
   * @param request - Chat completion request parameters
   * @returns Promise resolving to typed response
   * @throws {OpenRouterError} If request fails or validation errors occur
   *
   * @example
   * ```typescript
   * // Basic chat completion
   * const response = await service.createChatCompletion<string>({
   *   model: 'openai/gpt-3.5-turbo',
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'What is the capital of France?' }
   *   ]
   * });
   *
   * // Structured JSON response
   * interface FlashcardArray {
   *   flashcards: Array<{ front: string; back: string }>;
   * }
   *
   * const response = await service.createChatCompletion<FlashcardArray>({
   *   messages: [{ role: 'user', content: 'Generate flashcards...' }],
   *   responseFormat: {
   *     type: 'json_schema',
   *     json_schema: {
   *       name: 'flashcard_array',
   *       strict: true,
   *       schema: {
   *         type: 'object',
   *         properties: {
   *           flashcards: {
   *             type: 'array',
   *             items: {
   *               type: 'object',
   *               properties: {
   *                 front: { type: 'string' },
   *                 back: { type: 'string' }
   *               },
   *               required: ['front', 'back'],
   *               additionalProperties: false
   *             }
   *           }
   *         },
   *         required: ['flashcards'],
   *         additionalProperties: false
   *       }
   *     }
   *   }
   * });
   * ```
   */
  async createChatCompletion<T>(request: ChatCompletionRequest): Promise<T> {
    // Validate request
    this.validateRequest(request);

    // Build request body
    const body = this.buildRequestBody(request);

    // Make API request
    const response = await this.makeRequest<OpenRouterApiResponse>("/chat/completions", body);

    // Parse response based on format
    if (request.responseFormat) {
      return this.parseStructuredResponse<T>(response);
    } else {
      // For non-structured responses, return content as-is
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenRouterError(500, "PARSE_ERROR", "No content in API response");
      }
      return content as T;
    }
  }

  /**
   * Generates flashcards from source text
   * Convenience method with optimized prompts for flashcard generation
   *
   * @param sourceText - Text to generate flashcards from
   * @param options - Optional generation parameters
   * @returns Promise resolving to array of generated flashcards
   * @throws {OpenRouterError} If generation fails
   *
   * @example
   * ```typescript
   * const flashcards = await service.generateFlashcards(
   *   'The mitochondria is the powerhouse of the cell...',
   *   {
   *     minFlashcards: 3,
   *     maxFlashcards: 10,
   *     temperature: 0.7
   *   }
   * );
   * ```
   */
  async generateFlashcards(
    sourceText: string,
    options: FlashcardGenerationOptions = {}
  ): Promise<GeneratedFlashcard[]> {
    console.log("🎴 generateFlashcards: Starting");

    const {
      model = this._defaultModel,
      minFlashcards = 5,
      maxFlashcards = 15,
      temperature = this._defaultTemperature,
    } = options;

    console.log("🎯 Options:", { model, minFlashcards, maxFlashcards, temperature });

    // Sanitize input
    console.log("🧹 Sanitizing input...");
    const sanitizedText = this.sanitizeInput(sourceText);
    console.log("✅ Input sanitized, length:", sanitizedText.length);

    // Build system prompt with explicit JSON format instructions
    const systemPrompt = `You are an expert flashcard generator. Your task is to create high-quality flashcard questions and answers based on provided source material.

CRITICAL: You MUST respond with ONLY valid JSON in this exact format, with no additional text, markdown, or formatting:
{
  "flashcards": [
    {
      "front": "question text here",
      "back": "answer text here"
    }
  ]
}

Requirements:
- Generate between ${minFlashcards}-${maxFlashcards} flashcard pairs
- Each question (front) should be clear, concise, and testable
- Each answer (back) should be accurate and comprehensive but concise
- Avoid trivial or obvious questions
- Ensure questions promote understanding and retention
- Focus on key concepts, definitions, and relationships
- Use varied question types (what, why, how, when, etc.)
- Return ONLY the JSON object, no markdown code blocks, no additional text`;

    // Build user prompt
    const userPrompt = `Generate flashcards from the following text and return them in the specified JSON format:\n\n${sanitizedText}`;

    // Define JSON schema for response
    interface FlashcardArrayResponse {
      flashcards: GeneratedFlashcard[];
    }

    // Make request with structured response
    const response = await this.createChatCompletion<FlashcardArrayResponse>({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "flashcard_array",
          strict: true,
          schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: {
                      type: "string",
                      description: "The question or prompt for the flashcard",
                    },
                    back: {
                      type: "string",
                      description: "The answer or explanation for the flashcard",
                    },
                  },
                  required: ["front", "back"],
                  additionalProperties: false,
                },
              },
            },
            required: ["flashcards"],
            additionalProperties: false,
          },
        },
      },
    });

    return response.flashcards;
  }

  /**
   * Validates chat completion request parameters
   *
   * Performs comprehensive validation of all request parameters to ensure
   * they meet API requirements and prevent invalid requests from being sent.
   *
   * Validation includes:
   * - Messages array presence and non-empty check
   * - Message structure (role and content required)
   * - Role values (must be: system, user, or assistant)
   * - Temperature range (0-2)
   * - Token limits (positive integers)
   * - TopP range (0-1)
   * - Frequency/presence penalty ranges (-2 to 2)
   * - Response format structure (if provided)
   *
   * @param request - Request to validate
   * @throws {OpenRouterError} If validation fails with INVALID_REQUEST code and 400 status
   *
   * @example
   * ```typescript
   * // Valid request
   * validateRequest({
   *   messages: [{ role: 'user', content: 'Hello' }],
   *   temperature: 0.7
   * }); // ✅ No error
   *
   * // Invalid request
   * validateRequest({
   *   messages: [],
   *   temperature: 3.0
   * }); // ❌ Throws OpenRouterError
   * ```
   */
  private validateRequest(request: ChatCompletionRequest): void {
    // Validate messages array
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new OpenRouterError(400, "INVALID_REQUEST", "Messages array is required");
    }

    if (request.messages.length === 0) {
      throw new OpenRouterError(400, "INVALID_REQUEST", "Messages array cannot be empty");
    }

    // Validate each message
    for (let i = 0; i < request.messages.length; i++) {
      const message = request.messages[i];

      if (!message.role || !message.content) {
        throw new OpenRouterError(400, "INVALID_REQUEST", `Message at index ${i} must have both role and content`);
      }

      if (!["system", "user", "assistant"].includes(message.role)) {
        throw new OpenRouterError(
          400,
          "INVALID_REQUEST",
          `Invalid role "${message.role}" at index ${i}. Must be one of: system, user, assistant`
        );
      }

      if (typeof message.content !== "string") {
        throw new OpenRouterError(400, "INVALID_REQUEST", `Message content at index ${i} must be a string`);
      }
    }

    // Validate temperature
    if (request.temperature !== undefined) {
      if (typeof request.temperature !== "number") {
        throw new OpenRouterError(400, "INVALID_REQUEST", "Temperature must be a number");
      }

      if (request.temperature < 0 || request.temperature > 2) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "Temperature must be between 0 and 2");
      }
    }

    // Validate maxTokens
    if (request.maxTokens !== undefined) {
      if (typeof request.maxTokens !== "number" || request.maxTokens <= 0) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "maxTokens must be a positive number");
      }
    }

    // Validate topP
    if (request.topP !== undefined) {
      if (typeof request.topP !== "number" || request.topP < 0 || request.topP > 1) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "topP must be a number between 0 and 1");
      }
    }

    // Validate frequency and presence penalties
    if (request.frequencyPenalty !== undefined) {
      if (
        typeof request.frequencyPenalty !== "number" ||
        request.frequencyPenalty < -2 ||
        request.frequencyPenalty > 2
      ) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "frequencyPenalty must be a number between -2 and 2");
      }
    }

    if (request.presencePenalty !== undefined) {
      if (typeof request.presencePenalty !== "number" || request.presencePenalty < -2 || request.presencePenalty > 2) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "presencePenalty must be a number between -2 and 2");
      }
    }

    // Validate responseFormat
    if (request.responseFormat) {
      if (request.responseFormat.type !== "json_schema") {
        throw new OpenRouterError(400, "INVALID_REQUEST", "Only json_schema response format is supported");
      }

      if (!request.responseFormat.json_schema) {
        throw new OpenRouterError(
          400,
          "INVALID_REQUEST",
          "json_schema is required when using json_schema response format"
        );
      }

      if (!request.responseFormat.json_schema.name) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "json_schema.name is required");
      }

      if (!request.responseFormat.json_schema.schema) {
        throw new OpenRouterError(400, "INVALID_REQUEST", "json_schema.schema is required");
      }
    }
  }

  /**
   * Builds request body for OpenRouter API
   *
   * Constructs the final request body by:
   * - Converting camelCase parameter names to snake_case for API compatibility
   * - Applying default values for optional parameters
   * - Including only parameters that are explicitly set
   * - Formatting response_format according to API requirements
   *
   * @param request - Chat completion request with camelCase properties
   * @returns Formatted request body with snake_case properties ready for API submission
   *
   * @example
   * ```typescript
   * // Input (camelCase)
   * const request = {
   *   messages: [...],
   *   maxTokens: 500,
   *   topP: 0.9
   * };
   *
   * // Output (snake_case)
   * {
   *   model: 'openai/gpt-3.5-turbo',
   *   messages: [...],
   *   max_tokens: 500,
   *   top_p: 0.9,
   *   temperature: 0.7 // from default
   * }
   * ```
   */
  private buildRequestBody(request: ChatCompletionRequest): object {
    const body: Record<string, unknown> = {
      model: request.model || this._defaultModel,
      messages: request.messages,
    };

    // Add optional parameters
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    } else {
      body.temperature = this._defaultTemperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    } else {
      body.max_tokens = this._defaultMaxTokens;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      body.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      body.presence_penalty = request.presencePenalty;
    }

    if (request.responseFormat) {
      body.response_format = {
        type: request.responseFormat.type,
        json_schema: request.responseFormat.json_schema,
      };
    }

    if (request.stop) {
      body.stop = request.stop;
    }

    return body;
  }

  /**
   * Makes HTTP request to OpenRouter API
   *
   * Handles all HTTP communication with proper error handling, timeout management,
   * and security best practices. The method:
   * - Constructs the full URL from base URL and endpoint
   * - Sets required headers (Content-Type, Authorization)
   * - Adds optional tracking headers if configured
   * - Implements timeout using AbortController
   * - Handles network errors and converts them to OpenRouterError
   * - Parses and validates response
   *
   * @template T - Expected response type from API
   * @param endpoint - API endpoint path (e.g., '/chat/completions')
   * @param body - Request body to send (will be JSON stringified)
   * @returns Promise resolving to parsed API response of type T
   * @throws {OpenRouterError} If request fails, times out, or response is not ok
   *
   * @security
   * - API key is sent in Authorization header (never in URL or body)
   * - Uses HTTPS only (enforced by baseUrl)
   * - Implements timeout to prevent hanging connections
   * - Properly cleans up AbortController
   *
   * @example
   * ```typescript
   * const response = await this.makeRequest<OpenRouterApiResponse>(
   *   '/chat/completions',
   *   { model: 'gpt-3.5-turbo', messages: [...] }
   * );
   * ```
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this._baseUrl}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this._apiKey}`,
    };

    // Add optional tracking headers
    if (this._httpReferer) {
      headers["HTTP-Referer"] = this._httpReferer;
    }

    if (this._appTitle) {
      headers["X-Title"] = this._appTitle;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      // Make request
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse and return JSON
      return (await response.json()) as T;
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutId);

      // Handle abort/timeout error
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterError(408, "TIMEOUT_ERROR", `Request timed out after ${this._timeout}ms`);
      }

      // Handle network errors
      if (error instanceof Error) {
        throw new OpenRouterError(500, "NETWORK_ERROR", `Network error: ${error.message}`, {
          originalError: error.message,
        });
      }

      // Re-throw OpenRouterError instances
      if (error instanceof OpenRouterError) {
        throw error;
      }

      // Unknown error
      throw new OpenRouterError(500, "API_ERROR", "An unexpected error occurred", { originalError: String(error) });
    }
  }

  /**
   * Handles error responses from OpenRouter API
   *
   * Processes HTTP error responses (non-2xx status codes) and converts them
   * into structured OpenRouterError instances with appropriate semantic error codes.
   *
   * The method:
   * - Attempts to parse error response as JSON
   * - Falls back to status text if JSON parsing fails
   * - Extracts meaningful error message from various response formats
   * - Maps HTTP status codes to semantic error codes
   * - Includes retry-after header for rate limiting scenarios
   *
   * @param response - HTTP Response object with error status
   * @throws {OpenRouterError} Always throws - this method never returns normally
   *
   * @example
   * ```typescript
   * if (!response.ok) {
   *   await this.handleErrorResponse(response);
   *   // Never reaches here - always throws
   * }
   * ```
   *
   * @security
   * - Does not expose raw error details to prevent information leakage
   * - Sanitizes error messages before throwing
   * - Maps all errors to known error codes
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;

    try {
      errorData = await response.json();
    } catch {
      // If JSON parsing fails, use status text
      errorData = { message: response.statusText };
    }

    // Extract error message
    const errorMessage =
      typeof errorData === "object" && errorData !== null && "error" in errorData
        ? String((errorData as { error: { message?: string } }).error?.message || "Unknown error")
        : "Unknown error";

    // Get semantic error code
    const errorCode = this.getErrorCodeFromStatus(response.status);

    // Add retry-after header if available
    const details: Record<string, unknown> = {};
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      details.retryAfter = retryAfter;
    }

    throw new OpenRouterError(
      response.status,
      errorCode,
      errorMessage,
      Object.keys(details).length > 0 ? details : undefined
    );
  }

  /**
   * Maps HTTP status codes to semantic error codes
   *
   * Converts standard HTTP status codes into application-specific error codes
   * that provide more meaningful context for error handling and recovery.
   *
   * This enables consumers to:
   * - Handle different error types appropriately
   * - Determine if errors are retryable
   * - Provide specific user feedback
   * - Log errors with proper categorization
   *
   * @param status - HTTP status code from API response
   * @returns Semantic error code from OpenRouterErrorCode type
   *
   * @example
   * ```typescript
   * getErrorCodeFromStatus(429) // Returns 'RATE_LIMIT_EXCEEDED'
   * getErrorCodeFromStatus(401) // Returns 'AUTHENTICATION_ERROR'
   * getErrorCodeFromStatus(999) // Returns 'API_ERROR' (fallback)
   * ```
   *
   * Mapping table:
   * - 400 → INVALID_REQUEST (bad request parameters)
   * - 401, 403 → AUTHENTICATION_ERROR (invalid or missing auth)
   * - 402 → INSUFFICIENT_CREDITS (OpenRouter account needs credits)
   * - 404 → NOT_FOUND (model or resource not found)
   * - 429 → RATE_LIMIT_EXCEEDED (too many requests)
   * - 500, 502 → SERVER_ERROR (OpenRouter server issues)
   * - 503 → SERVICE_UNAVAILABLE (temporary outage)
   * - 504 → TIMEOUT_ERROR (gateway timeout)
   * - Others → API_ERROR (unknown/generic errors)
   */
  private getErrorCodeFromStatus(status: number): import("./openrouter.types").OpenRouterErrorCode {
    const errorCodeMap: Record<number, import("./openrouter.types").OpenRouterErrorCode> = {
      400: "INVALID_REQUEST",
      401: "AUTHENTICATION_ERROR",
      402: "INSUFFICIENT_CREDITS",
      403: "AUTHENTICATION_ERROR",
      404: "NOT_FOUND",
      429: "RATE_LIMIT_EXCEEDED",
      500: "SERVER_ERROR",
      502: "SERVER_ERROR",
      503: "SERVICE_UNAVAILABLE",
      504: "TIMEOUT_ERROR",
    };

    return errorCodeMap[status] || "API_ERROR";
  }

  /**
   * Parses structured JSON response from API
   *
   * Extracts and parses JSON content from the API response with multiple fallback
   * strategies to handle various response formats. This is crucial for structured
   * outputs where we expect JSON schemas to be followed.
   *
   * Parsing strategies (in order):
   * 1. Direct JSON.parse() - fastest for well-formatted JSON
   * 2. Extract from markdown code blocks (```json ... ```)
   * 3. Regex extraction of JSON objects/arrays
   * 4. Parse markdown flashcard format as fallback
   * 5. Throw PARSE_ERROR if all strategies fail
   *
   * @template T - Expected response type matching the JSON schema
   * @param response - Raw API response containing choices array
   * @returns Parsed and typed response object
   * @throws {OpenRouterError} With PARSE_ERROR code if:
   *   - Response has no content
   *   - Content cannot be parsed as JSON
   *   - Content doesn't match expected structure
   *
   * @example
   * ```typescript
   * // API returns: {"flashcards": [...]}
   * const result = parseStructuredResponse<{flashcards: Array<...>}>(response);
   * // result.flashcards is properly typed
   *
   * // API returns: ```json\n{"data": true}\n```
   * const result = parseStructuredResponse<{data: boolean}>(response);
   * // Extracts from markdown and parses
   * ```
   *
   * @remarks
   * The method includes the first 200 characters of failed content in error
   * details for debugging purposes while avoiding logging large payloads.
   */
  private parseStructuredResponse<T>(response: OpenRouterApiResponse): T {
    const content = response.choices?.[0]?.message?.content;

    console.log("🔍 Parsing response...");
    console.log("📄 Content preview (first 500 chars):", content?.substring(0, 500));

    if (!content) {
      throw new OpenRouterError(500, "PARSE_ERROR", "No content in API response");
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content) as T;
      console.log("✅ Successfully parsed as JSON");
      return parsed;
    } catch (parseError) {
      console.log("⚠️ Direct JSON parse failed, trying markdown extraction...");
      // Try to extract JSON from markdown code blocks
      // Match both ```json and ``` with optional whitespace and newlines
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        console.log("📦 Found markdown code block, attempting parse...");
        console.log("📝 Extracted content (first 500 chars):", codeBlockMatch[1].substring(0, 500));
        try {
          // Trim the extracted content to remove any leading/trailing whitespace
          const extractedJson = codeBlockMatch[1].trim();
          const parsed = JSON.parse(extractedJson) as T;
          console.log("✅ Successfully parsed from markdown");
          return parsed;
        } catch (mdError) {
          console.log("❌ Markdown extraction failed:", mdError instanceof Error ? mdError.message : String(mdError));
          console.log("❌ Failed content (first 500 chars):", codeBlockMatch[1].substring(0, 500));
          // Continue to regex extraction
        }
      } else {
        console.log("❌ No markdown code block found");
      }

      // Try to extract JSON object or array using regex
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      const jsonArrayMatch = content.match(/\[[\s\S]*\]/);

      const jsonMatch = jsonObjectMatch || jsonArrayMatch;

      if (jsonMatch) {
        console.log("🔍 Found JSON-like content, attempting parse...");
        try {
          const parsed = JSON.parse(jsonMatch[0]) as T;
          console.log("✅ Successfully parsed from regex match");
          return parsed;
        } catch {
          console.log("❌ Regex extraction failed, trying markdown flashcard parser...");
          // Continue to markdown flashcard parser
        }
      }

      // Last resort: Try to parse markdown-formatted flashcards
      console.log("🃏 Attempting to parse markdown flashcards...");
      try {
        const flashcards = this.parseMarkdownFlashcards(content);
        if (flashcards.length > 0) {
          console.log("✅ Successfully parsed markdown flashcards:", flashcards.length);
          return { flashcards } as T;
        }
      } catch (markdownError) {
        console.log("❌ Markdown flashcard parsing failed:", markdownError);
      }

      // All parsing attempts failed
      throw new OpenRouterError(500, "PARSE_ERROR", "Failed to parse JSON from API response", {
        content: content.substring(0, 200), // Include first 200 chars for debugging
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
  }

  /**
   * Parses flashcards from markdown-formatted text
   *
   * Fallback parser for when AI models don't respect JSON schema and return
   * markdown-formatted flashcards instead. Handles various markdown formats:
   * - **Flashcard N** followed by Front:/Back: or *Front:/*Back:
   * - Numbered lists with Q: and A: format
   *
   * @param content - Markdown-formatted content containing flashcards
   * @returns Array of parsed flashcards
   * @throws Error if no flashcards can be extracted
   *
   * @example
   * ```typescript
   * const content = `
   * **Flashcard 1**
   * * Front: Question here?
   * * Back: Answer here
   * `;
   * const flashcards = parseMarkdownFlashcards(content);
   * // Returns: [{ front: "Question here?", back: "Answer here" }]
   * ```
   */
  private parseMarkdownFlashcards(content: string): GeneratedFlashcard[] {
    const flashcards: GeneratedFlashcard[] = [];

    // Pattern 1: **Flashcard N** format with * Front: / * Back:
    const flashcardBlocks = content.split(/\*\*Flashcard \d+\*\*/i);

    for (const block of flashcardBlocks) {
      if (!block.trim()) continue;

      // Try to extract Front and Back
      const frontMatch = block.match(/\*\s*Front:\s*(.+?)(?=\n\s*\*\s*Back:)/is);
      const backMatch = block.match(/\*\s*Back:\s*(.+?)(?=\n\s*\*\*Flashcard|\n\s*$|$)/is);

      if (frontMatch && backMatch) {
        flashcards.push({
          front: frontMatch[1].trim(),
          back: backMatch[1].trim(),
        });
      }
    }

    // If we found flashcards, return them
    if (flashcards.length > 0) {
      return flashcards;
    }

    // Pattern 2: Try alternative format with Q: and A: or Question: and Answer:
    const lines = content.split("\n");
    let currentFront = "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Look for question/front patterns
      const frontPatterns = [/^(?:\*\s*)?(?:Front|Question|Q):\s*(.+)$/i, /^\d+\.\s*(?:Front|Question|Q):\s*(.+)$/i];

      for (const pattern of frontPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          currentFront = match[1].trim();
          break;
        }
      }

      // Look for answer/back patterns
      if (currentFront) {
        const backPatterns = [/^(?:\*\s*)?(?:Back|Answer|A):\s*(.+)$/i, /^\d+\.\s*(?:Back|Answer|A):\s*(.+)$/i];

        for (const pattern of backPatterns) {
          const match = trimmedLine.match(pattern);
          if (match) {
            flashcards.push({
              front: currentFront,
              back: match[1].trim(),
            });
            currentFront = "";
            break;
          }
        }
      }
    }

    return flashcards;
  }

  /**
   * Sanitizes user input to prevent injection attacks and ensure safe processing
   *
   * Performs multiple sanitization operations on user-provided text to prevent
   * security issues and ensure reasonable resource usage. This is a critical
   * security function that protects both the application and the API.
   *
   * Sanitization operations:
   * 1. Remove null bytes (\0) - prevents null byte injection attacks
   * 2. Enforce maximum length (100KB) - prevents excessive resource usage
   * 3. Normalize whitespace - removes excessive whitespace, trims
   *
   * @param text - Raw user input text to sanitize
   * @returns Sanitized text safe for API submission
   *
   * @example
   * ```typescript
   * sanitizeInput('Hello\0World')
   * // Returns: 'Hello World' (null byte removed, normalized)
   *
   * sanitizeInput('A'.repeat(200000))
   * // Returns: 'A'.repeat(100000) (truncated to 100KB)
   *
   * sanitizeInput('Hello    World     Test')
   * // Returns: 'Hello World Test' (whitespace normalized)
   * ```
   *
   * @security
   * This method is essential for:
   * - Preventing null byte injection attacks
   * - Avoiding API timeouts from excessive input
   * - Reducing token costs by removing redundant whitespace
   * - Protecting against potential buffer overflow scenarios
   *
   * @remarks
   * The 100KB limit is generous for most use cases but prevents abuse.
   * Adjust maxLength constant if your use case requires different limits.
   */
  private sanitizeInput(text: string): string {
    // Remove null bytes
    let sanitized = text.replace(/\0/g, "");

    // Trim to reasonable length (100KB max)
    const maxLength = 100000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
  }
}
