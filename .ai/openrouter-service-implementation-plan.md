# OpenRouter Service Implementation Plan

## 1. Service Description

The OpenRouter Service is a comprehensive abstraction layer for interacting with the OpenRouter.ai API. It encapsulates all logic related to LLM-based chat completions, providing a type-safe, error-resilient interface for generating AI-powered content within the application.

### Purpose

- Centralize all OpenRouter API interactions in a single, reusable service
- Provide type-safe methods for constructing chat completion requests
- Handle authentication, request configuration, and response parsing
- Implement robust error handling with domain-specific error types
- Support structured JSON responses via JSON Schema validation
- Enable flexible model selection and parameter configuration

### Key Responsibilities

1. **API Communication**: Manage HTTP requests to OpenRouter endpoints
2. **Authentication**: Handle API key management and authorization headers
3. **Request Construction**: Build properly formatted chat completion requests
4. **Response Parsing**: Extract and validate structured responses
5. **Error Handling**: Provide meaningful error messages and error recovery
6. **Type Safety**: Ensure compile-time type checking for all operations

---

## 2. Constructor Description

### Purpose

Initialize the OpenRouter service with configuration parameters that will be used across all API calls.

### Constructor Signature

```typescript
constructor(config?: OpenRouterServiceConfig)
```

### Configuration Parameters

```typescript
interface OpenRouterServiceConfig {
  /**
   * OpenRouter API key. If not provided, will attempt to read from environment.
   * @default import.meta.env.OPENROUTER_API_KEY
   */
  apiKey?: string;

  /**
   * Base URL for OpenRouter API endpoints.
   * @default 'https://openrouter.ai/api/v1'
   */
  baseUrl?: string;

  /**
   * Default model to use for completions if not specified in method calls.
   * @default 'openai/gpt-3.5-turbo'
   */
  defaultModel?: string;

  /**
   * Default timeout for API requests in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * HTTP referrer for tracking in OpenRouter dashboard.
   * @optional
   */
  httpReferer?: string;

  /**
   * App title for tracking in OpenRouter dashboard.
   * @optional
   */
  appTitle?: string;
}
```

### Implementation Steps

1. **Accept optional configuration object**: Allow users to override defaults
2. **Validate API key**: Check if API key is provided or available in environment
3. **Set default values**: Apply sensible defaults for all optional parameters
4. **Store configuration**: Save configuration to private class properties
5. **Throw early errors**: If API key is missing, throw immediately in constructor

### Example Usage

```typescript
// Using environment variables (recommended)
const service = new OpenRouterService();

// With custom configuration
const service = new OpenRouterService({
  apiKey: 'sk-or-v1-...',
  defaultModel: 'anthropic/claude-3-sonnet',
  timeout: 60000,
  httpReferer: 'https://myapp.com',
  appTitle: 'Flashcard Generator'
});
```

---

## 3. Public Methods and Fields

### 3.1 Core Chat Completion Method

#### `createChatCompletion<T>(request: ChatCompletionRequest): Promise<T>`

The primary method for creating chat completions with OpenRouter.

##### Parameters

```typescript
interface ChatCompletionRequest {
  /**
   * The model to use for this completion.
   * @example 'openai/gpt-4', 'anthropic/claude-3-opus'
   */
  model?: string;

  /**
   * Array of message objects forming the conversation.
   */
  messages: ChatMessage[];

  /**
   * Sampling temperature between 0 and 2.
   * Higher values make output more random.
   * @default 0.7
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate.
   * @default 2000
   */
  maxTokens?: number;

  /**
   * Top-p sampling parameter.
   * Alternative to temperature.
   * @default 1.0
   */
  topP?: number;

  /**
   * Presence penalty between -2.0 and 2.0.
   * Positive values penalize new tokens based on whether they appear in the text so far.
   * @default 0
   */
  presencePenalty?: number;

  /**
   * Frequency penalty between -2.0 and 2.0.
   * Positive values penalize new tokens based on their existing frequency.
   * @default 0
   */
  frequencyPenalty?: number;

  /**
   * JSON Schema for structured output.
   * When provided, the model will return JSON matching this schema.
   */
  responseFormat?: ResponseFormat;

  /**
   * Number of completions to generate.
   * @default 1
   */
  n?: number;

  /**
   * Stop sequences where the API will stop generating.
   */
  stop?: string | string[];
}

interface ChatMessage {
  /**
   * The role of the message author.
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * The content of the message.
   */
  content: string;
}

interface ResponseFormat {
  /**
   * Type of response format.
   * Use 'json_schema' for structured JSON responses.
   */
  type: 'json_schema' | 'json_object';

  /**
   * JSON Schema definition (required when type is 'json_schema').
   */
  json_schema?: {
    /**
     * Name for the schema (required).
     */
    name: string;

    /**
     * Whether to enforce strict schema validation.
     * @default true
     */
    strict?: boolean;

    /**
     * The JSON Schema object defining the expected structure.
     */
    schema: Record<string, unknown>;
  };
}
```

##### Return Value

Returns a Promise that resolves to the parsed response of type `T`. The generic type `T` should match the structure defined in `responseFormat.json_schema.schema`.

##### Example Usage

**Example 1: Basic Chat Completion**

```typescript
const response = await service.createChatCompletion<string>({
  model: 'openai/gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant.'
    },
    {
      role: 'user',
      content: 'What is the capital of France?'
    }
  ],
  temperature: 0.7,
  maxTokens: 100
});

console.log(response); // "The capital of France is Paris."
```

**Example 2: Structured JSON Response**

```typescript
interface FlashcardArray {
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}

const response = await service.createChatCompletion<FlashcardArray>({
  messages: [
    {
      role: 'system',
      content: 'You are an expert flashcard generator.'
    },
    {
      role: 'user',
      content: 'Generate 3 flashcards about photosynthesis.'
    }
  ],
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcard_array',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string' },
                back: { type: 'string' }
              },
              required: ['front', 'back'],
              additionalProperties: false
            }
          }
        },
        required: ['flashcards'],
        additionalProperties: false
      }
    }
  }
});

console.log(response.flashcards); // Array of flashcard objects
```

**Example 3: Multi-turn Conversation**

```typescript
const response = await service.createChatCompletion<string>({
  messages: [
    {
      role: 'system',
      content: 'You are a math tutor.'
    },
    {
      role: 'user',
      content: 'What is 2 + 2?'
    },
    {
      role: 'assistant',
      content: '2 + 2 equals 4.'
    },
    {
      role: 'user',
      content: 'Can you explain why?'
    }
  ]
});
```

### 3.2 Convenience Methods

#### `generateFlashcards(sourceText: string, options?: FlashcardGenerationOptions): Promise<GeneratedFlashcard[]>`

A specialized convenience method for flashcard generation.

```typescript
interface FlashcardGenerationOptions {
  model?: string;
  minFlashcards?: number;
  maxFlashcards?: number;
  temperature?: number;
}

interface GeneratedFlashcard {
  front: string;
  back: string;
}
```

##### Implementation Example

```typescript
async generateFlashcards(
  sourceText: string,
  options: FlashcardGenerationOptions = {}
): Promise<GeneratedFlashcard[]> {
  const {
    model = this.config.defaultModel,
    minFlashcards = 3,
    maxFlashcards = 10,
    temperature = 0.7
  } = options;

  const systemPrompt = `You are an expert flashcard generator. Your task is to create high-quality flashcard questions and answers based on provided source material.

Requirements:
- Generate between ${minFlashcards}-${maxFlashcards} flashcard pairs
- Each question (front) should be clear, concise, and testable
- Each answer (back) should be accurate and comprehensive but concise
- Avoid trivial or obvious questions
- Ensure questions promote understanding and retention`;

  const userPrompt = `Generate flashcards from this source material:\n\n${sourceText}`;

  interface FlashcardResponse {
    flashcards: GeneratedFlashcard[];
  }

  const response = await this.createChatCompletion<FlashcardResponse>({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'flashcard_generation',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  front: {
                    type: 'string',
                    description: 'The question or prompt for the flashcard'
                  },
                  back: {
                    type: 'string',
                    description: 'The answer or explanation for the flashcard'
                  }
                },
                required: ['front', 'back'],
                additionalProperties: false
              },
              minItems: minFlashcards,
              maxItems: maxFlashcards
            }
          },
          required: ['flashcards'],
          additionalProperties: false
        }
      }
    }
  });

  return response.flashcards;
}
```

### 3.3 Public Fields

```typescript
/**
 * Read-only access to service configuration.
 */
public readonly config: Readonly<OpenRouterServiceConfig>;

/**
 * Current API version being used.
 */
public readonly apiVersion: string = 'v1';
```

---

## 4. Private Methods and Fields

### 4.1 Private Fields

```typescript
/**
 * Internal configuration storage.
 */
private readonly _config: OpenRouterServiceConfig;

/**
 * Base URL for API requests.
 */
private readonly _baseUrl: string;

/**
 * API key for authentication.
 */
private readonly _apiKey: string;

/**
 * Default timeout for requests.
 */
private readonly _timeout: number;
```

### 4.2 HTTP Request Helper

#### `private async makeRequest<T>(endpoint: string, body: unknown): Promise<T>`

Handles all HTTP communication with OpenRouter API.

##### Implementation

```typescript
private async makeRequest<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const url = `${this._baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this._apiKey}`,
  };

  // Add optional tracking headers
  if (this._config.httpReferer) {
    headers['HTTP-Referer'] = this._config.httpReferer;
  }
  if (this._config.appTitle) {
    headers['X-Title'] = this._config.appTitle;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this._timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof OpenRouterError) {
      throw error;
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenRouterError(
        408,
        'TIMEOUT',
        `Request timed out after ${this._timeout}ms`
      );
    }
    
    throw new OpenRouterError(
      500,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }
}
```

### 4.3 Response Parser

#### `private parseStructuredResponse<T>(response: OpenRouterApiResponse): T`

Extracts and validates structured JSON responses.

```typescript
private parseStructuredResponse<T>(
  response: OpenRouterApiResponse
): T {
  if (!response.choices?.[0]?.message?.content) {
    throw new OpenRouterError(
      500,
      'INVALID_RESPONSE',
      'Unexpected response format from OpenRouter'
    );
  }

  const content = response.choices[0].message.content.trim();

  try {
    // For JSON schema responses, content should be valid JSON
    return JSON.parse(content) as T;
  } catch (error) {
    // Fallback: try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) 
                   || content.match(/\{[\s\S]*\}/) 
                   || content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new OpenRouterError(
        500,
        'PARSE_ERROR',
        'Failed to extract JSON from AI response'
      );
    }

    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T;
    } catch {
      throw new OpenRouterError(
        500,
        'PARSE_ERROR',
        'Invalid JSON in AI response'
      );
    }
  }
}
```

### 4.4 Error Response Handler

#### `private async handleErrorResponse(response: Response): Promise<never>`

Processes error responses from the API and throws appropriate errors.

```typescript
private async handleErrorResponse(response: Response): Promise<never> {
  let errorData: any;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = {};
  }

  const errorMessage = 
    errorData?.error?.message || 
    errorData?.message || 
    `HTTP ${response.status}: ${response.statusText}`;
  
  const errorCode = 
    errorData?.error?.code || 
    errorData?.code || 
    this.getErrorCodeFromStatus(response.status);

  throw new OpenRouterError(
    response.status,
    errorCode,
    errorMessage
  );
}
```

### 4.5 Status Code Mapper

#### `private getErrorCodeFromStatus(status: number): string`

Maps HTTP status codes to semantic error codes.

```typescript
private getErrorCodeFromStatus(status: number): string {
  const errorCodeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    402: 'INSUFFICIENT_CREDITS',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    408: 'TIMEOUT',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };

  return errorCodeMap[status] || 'API_ERROR';
}
```

### 4.6 Request Validator

#### `private validateRequest(request: ChatCompletionRequest): void`

Validates request parameters before sending to API.

```typescript
private validateRequest(request: ChatCompletionRequest): void {
  // Validate messages array
  if (!request.messages || !Array.isArray(request.messages)) {
    throw new OpenRouterError(
      400,
      'INVALID_REQUEST',
      'Messages must be a non-empty array'
    );
  }

  if (request.messages.length === 0) {
    throw new OpenRouterError(
      400,
      'INVALID_REQUEST',
      'Messages array cannot be empty'
    );
  }

  // Validate each message
  for (const message of request.messages) {
    if (!message.role || !message.content) {
      throw new OpenRouterError(
        400,
        'INVALID_REQUEST',
        'Each message must have role and content'
      );
    }

    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new OpenRouterError(
        400,
        'INVALID_REQUEST',
        `Invalid message role: ${message.role}`
      );
    }
  }

  // Validate temperature
  if (request.temperature !== undefined) {
    if (request.temperature < 0 || request.temperature > 2) {
      throw new OpenRouterError(
        400,
        'INVALID_REQUEST',
        'Temperature must be between 0 and 2'
      );
    }
  }

  // Validate maxTokens
  if (request.maxTokens !== undefined && request.maxTokens < 1) {
    throw new OpenRouterError(
      400,
      'INVALID_REQUEST',
      'maxTokens must be at least 1'
    );
  }

  // Validate response format
  if (request.responseFormat?.type === 'json_schema') {
    if (!request.responseFormat.json_schema?.name) {
      throw new OpenRouterError(
        400,
        'INVALID_REQUEST',
        'json_schema.name is required when using json_schema type'
      );
    }

    if (!request.responseFormat.json_schema?.schema) {
      throw new OpenRouterError(
        400,
        'INVALID_REQUEST',
        'json_schema.schema is required when using json_schema type'
      );
    }
  }
}
```

### 4.7 Request Builder

#### `private buildRequestBody(request: ChatCompletionRequest): object`

Constructs the final request body for OpenRouter API.

```typescript
private buildRequestBody(request: ChatCompletionRequest): object {
  const body: any = {
    model: request.model || this._config.defaultModel,
    messages: request.messages,
  };

  // Add optional parameters only if specified
  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  if (request.maxTokens !== undefined) {
    body.max_tokens = request.maxTokens;
  }

  if (request.topP !== undefined) {
    body.top_p = request.topP;
  }

  if (request.presencePenalty !== undefined) {
    body.presence_penalty = request.presencePenalty;
  }

  if (request.frequencyPenalty !== undefined) {
    body.frequency_penalty = request.frequencyPenalty;
  }

  if (request.responseFormat) {
    body.response_format = request.responseFormat;
  }

  if (request.n !== undefined) {
    body.n = request.n;
  }

  if (request.stop !== undefined) {
    body.stop = request.stop;
  }

  return body;
}
```

---

## 5. Error Handling

### 5.1 Custom Error Class

```typescript
/**
 * Error thrown when OpenRouter API operations fail.
 * Provides structured error information for better error handling.
 */
export class OpenRouterError extends Error {
  /**
   * @param statusCode - HTTP status code (e.g., 400, 401, 500)
   * @param errorCode - Semantic error code (e.g., 'RATE_LIMIT_EXCEEDED')
   * @param message - Human-readable error message
   * @param details - Optional additional error details
   */
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }

  /**
   * Checks if the error is retryable based on status code.
   */
  public isRetryable(): boolean {
    return [408, 429, 500, 502, 503].includes(this.statusCode);
  }

  /**
   * Converts error to JSON for logging or API responses.
   */
  public toJSON(): object {
    return {
      name: this.name,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      details: this.details,
    };
  }
}
```

### 5.2 Error Scenarios and Handling

#### Error Scenario 1: Missing API Key

**Situation**: API key is not provided in constructor or environment variables.

**Handling**:
```typescript
if (!apiKey) {
  throw new OpenRouterError(
    500,
    'MISSING_CONFIG',
    'OpenRouter API key is not configured. Provide it in constructor or set OPENROUTER_API_KEY environment variable'
  );
}
```

#### Error Scenario 2: Invalid Request Parameters

**Situation**: Request validation fails (e.g., empty messages array, invalid temperature).

**Handling**:
```typescript
this.validateRequest(request); // Throws OpenRouterError with 400 status
```

#### Error Scenario 3: Network Timeout

**Situation**: Request exceeds configured timeout duration.

**Handling**:
```typescript
if (error.name === 'AbortError') {
  throw new OpenRouterError(
    408,
    'TIMEOUT',
    `Request timed out after ${this._timeout}ms`
  );
}
```

#### Error Scenario 4: Rate Limiting

**Situation**: Too many requests sent to OpenRouter API.

**Handling**:
```typescript
// Detected from 429 status code
throw new OpenRouterError(
  429,
  'RATE_LIMIT_EXCEEDED',
  'Rate limit exceeded. Please retry after some time.',
  { retryAfter: response.headers.get('Retry-After') }
);
```

#### Error Scenario 5: Insufficient Credits

**Situation**: OpenRouter account has insufficient credits.

**Handling**:
```typescript
// Detected from 402 status code
throw new OpenRouterError(
  402,
  'INSUFFICIENT_CREDITS',
  'Insufficient credits in OpenRouter account'
);
```

#### Error Scenario 6: Invalid Model Name

**Situation**: Specified model doesn't exist or isn't accessible.

**Handling**:
```typescript
// Detected from 404 or specific error response
throw new OpenRouterError(
  404,
  'MODEL_NOT_FOUND',
  `Model '${request.model}' not found or not accessible`
);
```

#### Error Scenario 7: Malformed JSON Response

**Situation**: API returns content that cannot be parsed as JSON.

**Handling**:
```typescript
try {
  return JSON.parse(content);
} catch {
  // Try fallback extraction
  const extracted = this.extractJsonFromContent(content);
  if (!extracted) {
    throw new OpenRouterError(
      500,
      'PARSE_ERROR',
      'Failed to parse JSON from AI response',
      { content }
    );
  }
  return extracted;
}
```

#### Error Scenario 8: Schema Validation Failure

**Situation**: Response doesn't match expected JSON schema.

**Handling**:
```typescript
// Use a validation library like Zod
const validated = schema.safeParse(parsedResponse);
if (!validated.success) {
  throw new OpenRouterError(
    500,
    'SCHEMA_VALIDATION_FAILED',
    'Response does not match expected schema',
    { errors: validated.error.errors }
  );
}
```

#### Error Scenario 9: Service Unavailable

**Situation**: OpenRouter service is down or unreachable.

**Handling**:
```typescript
if (response.status === 503) {
  throw new OpenRouterError(
    503,
    'SERVICE_UNAVAILABLE',
    'OpenRouter service is temporarily unavailable'
  );
}
```

#### Error Scenario 10: Unknown Network Error

**Situation**: Network error that doesn't fit other categories.

**Handling**:
```typescript
throw new OpenRouterError(
  500,
  'NETWORK_ERROR',
  error instanceof Error ? error.message : 'Unknown network error occurred',
  { originalError: error }
);
```

### 5.3 Error Handling Best Practices

1. **Always throw OpenRouterError**: Never throw generic errors; always use the custom error class
2. **Provide context**: Include relevant details in the error message and details field
3. **Log appropriately**: Log errors at appropriate levels (error for 5xx, warn for 4xx)
4. **Don't expose sensitive data**: Never include API keys or user data in error messages
5. **Use semantic error codes**: Make error codes searchable and meaningful
6. **Enable retry logic**: Mark errors as retryable when appropriate
7. **Preserve stack traces**: Ensure Error.captureStackTrace is called

---

## 6. Security Considerations

### 6.1 API Key Management

**Issue**: API keys must be protected from exposure.

**Solutions**:

1. **Never hardcode API keys**: Always use environment variables or secure configuration
2. **Use server-side only**: Never expose API key to client-side code
3. **Rotate keys regularly**: Implement key rotation policy
4. **Use different keys per environment**: Separate keys for dev, staging, production

**Implementation**:
```typescript
// ✅ CORRECT: Server-side only
const apiKey = import.meta.env.OPENROUTER_API_KEY;

// ❌ WRONG: Hardcoded
const apiKey = 'sk-or-v1-...';

// ❌ WRONG: Client-side accessible
const apiKey = process.env.PUBLIC_OPENROUTER_API_KEY;
```

### 6.2 Request Validation

**Issue**: User input could be used to inject malicious prompts.

**Solutions**:

1. **Sanitize input**: Remove or escape potentially harmful characters
2. **Validate length**: Enforce maximum input lengths
3. **Rate limiting**: Implement per-user rate limits
4. **Content filtering**: Screen for inappropriate content

**Implementation**:
```typescript
private sanitizeInput(text: string): string {
  // Remove null bytes
  text = text.replace(/\0/g, '');
  
  // Trim excessive whitespace
  text = text.trim().replace(/\s+/g, ' ');
  
  // Enforce maximum length
  const MAX_LENGTH = 50000;
  if (text.length > MAX_LENGTH) {
    throw new OpenRouterError(
      400,
      'INPUT_TOO_LONG',
      `Input exceeds maximum length of ${MAX_LENGTH} characters`
    );
  }
  
  return text;
}
```

### 6.3 Response Validation

**Issue**: AI responses could contain unexpected or malicious content.

**Solutions**:

1. **Use JSON Schema**: Enforce structured responses
2. **Validate types**: Ensure response fields have expected types
3. **Sanitize output**: Clean response content before displaying to users
4. **Set strict mode**: Use `strict: true` in JSON schemas

**Implementation**:
```typescript
responseFormat: {
  type: 'json_schema',
  json_schema: {
    name: 'safe_response',
    strict: true, // ✅ Enforces strict validation
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' }
      },
      required: ['content'],
      additionalProperties: false // ✅ Prevents extra fields
    }
  }
}
```

### 6.4 Rate Limiting

**Issue**: Excessive API calls can lead to high costs and service disruption.

**Solutions**:

1. **Implement client-side throttling**: Limit requests per time window
2. **Track usage per user**: Monitor and limit per-user API consumption
3. **Respect API rate limits**: Handle 429 responses appropriately
4. **Implement exponential backoff**: Retry with increasing delays

**Implementation**:
```typescript
private async retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof OpenRouterError && error.isRetryable()) {
        lastError = error;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError!;
}
```

### 6.5 Data Privacy

**Issue**: User data sent to AI models may be stored or used for training.

**Solutions**:

1. **Review OpenRouter privacy policy**: Understand data handling
2. **Use privacy-focused models**: Choose models that don't train on user data
3. **Anonymize data**: Remove PII before sending to API
4. **Inform users**: Disclose AI usage in privacy policy

### 6.6 Timeout Configuration

**Issue**: Long-running requests can hang and consume resources.

**Solutions**:

1. **Set reasonable timeouts**: Default to 30 seconds, adjust based on use case
2. **Use AbortController**: Enable request cancellation
3. **Handle timeout errors**: Provide clear feedback to users

### 6.7 Error Message Sanitization

**Issue**: Error messages might expose internal implementation details.

**Solutions**:

1. **Don't expose stack traces**: Only in development mode
2. **Generic user messages**: Show user-friendly messages, log details server-side
3. **Filter sensitive data**: Remove API keys, tokens from error details

**Implementation**:
```typescript
public getUserMessage(): string {
  const userMessages: Record<string, string> = {
    'MISSING_CONFIG': 'Service configuration error. Please contact support.',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
    'INSUFFICIENT_CREDITS': 'Service temporarily unavailable.',
    'TIMEOUT': 'Request took too long. Please try again.',
  };
  
  return userMessages[this.errorCode] || 'An unexpected error occurred.';
}
```

---

## 7. Step-by-Step Implementation Plan

### Phase 1: Setup and Configuration (1-2 hours)

#### Step 1.1: Create Service File Structure

1. Create file: `src/lib/services/openrouter.service.ts`
2. Add service exports to `src/lib/services/index.ts`

#### Step 1.2: Define TypeScript Interfaces

1. Create `OpenRouterServiceConfig` interface
2. Create `ChatCompletionRequest` interface
3. Create `ChatMessage` interface
4. Create `ResponseFormat` interface
5. Create `OpenRouterApiResponse` interface (internal)

#### Step 1.3: Implement OpenRouterError Class

1. Extend Error class
2. Add statusCode, errorCode, details properties
3. Implement `isRetryable()` method
4. Implement `toJSON()` method
5. Add proper error capture for stack traces

#### Step 1.4: Update Environment Types

1. Add `OPENROUTER_API_KEY` to `src/env.d.ts`
2. Ensure type safety for environment variables

### Phase 2: Core Service Implementation (3-4 hours)

#### Step 2.1: Implement Constructor

1. Accept optional configuration parameter
2. Set default values for all optional fields
3. Validate API key presence
4. Store configuration in private fields
5. Throw OpenRouterError if API key is missing

```typescript
export class OpenRouterService {
  private readonly _apiKey: string;
  private readonly _baseUrl: string;
  private readonly _timeout: number;
  private readonly _config: OpenRouterServiceConfig;

  constructor(config: OpenRouterServiceConfig = {}) {
    this._apiKey = config.apiKey || import.meta.env.OPENROUTER_API_KEY;
    
    if (!this._apiKey) {
      throw new OpenRouterError(
        500,
        'MISSING_CONFIG',
        'OpenRouter API key is not configured'
      );
    }

    this._baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this._timeout = config.timeout || 30000;
    this._config = {
      ...config,
      apiKey: this._apiKey,
      baseUrl: this._baseUrl,
      timeout: this._timeout,
      defaultModel: config.defaultModel || 'openai/gpt-3.5-turbo'
    };
  }

  public get config(): Readonly<OpenRouterServiceConfig> {
    return this._config;
  }
}
```

#### Step 2.2: Implement Request Validation

1. Create `validateRequest()` private method
2. Check messages array is non-empty
3. Validate each message has role and content
4. Validate role is one of: system, user, assistant
5. Validate temperature range (0-2)
6. Validate maxTokens is positive
7. Validate responseFormat structure when provided

#### Step 2.3: Implement Request Builder

1. Create `buildRequestBody()` private method
2. Set model (use default if not provided)
3. Add messages array
4. Conditionally add optional parameters
5. Convert camelCase to snake_case for API compatibility

#### Step 2.4: Implement HTTP Request Handler

1. Create `makeRequest()` private method
2. Build complete URL from base URL and endpoint
3. Set headers (Content-Type, Authorization)
4. Add optional tracking headers (HTTP-Referer, X-Title)
5. Implement timeout using AbortController
6. Handle fetch errors and convert to OpenRouterError
7. Check response.ok and handle errors
8. Return parsed JSON response

#### Step 2.5: Implement Error Response Handler

1. Create `handleErrorResponse()` private method
2. Try to parse error JSON from response
3. Extract error message and code
4. Map status codes to semantic error codes
5. Throw OpenRouterError with appropriate details

#### Step 2.6: Implement Response Parser

1. Create `parseStructuredResponse()` private method
2. Extract content from response.choices[0].message.content
3. Try to parse as JSON
4. On failure, try to extract JSON from markdown code blocks
5. Try regex patterns for JSON objects/arrays
6. Throw parse error if all methods fail
7. Return typed response

### Phase 3: Public API Methods (2-3 hours)

#### Step 3.1: Implement Core Chat Completion Method

1. Create `createChatCompletion<T>()` public method
2. Validate request using `validateRequest()`
3. Build request body using `buildRequestBody()`
4. Make API request using `makeRequest()`
5. Parse response based on whether responseFormat is provided
6. Return typed response

```typescript
async createChatCompletion<T>(
  request: ChatCompletionRequest
): Promise<T> {
  this.validateRequest(request);
  
  const body = this.buildRequestBody(request);
  const response = await this.makeRequest<OpenRouterApiResponse>(
    '/chat/completions',
    body
  );

  if (request.responseFormat) {
    return this.parseStructuredResponse<T>(response);
  } else {
    // For non-structured responses, return content as string
    return response.choices[0].message.content as T;
  }
}
```

#### Step 3.2: Implement Flashcard Generation Method

1. Create `generateFlashcards()` public method
2. Define system prompt with requirements
3. Build user prompt with source text
4. Define JSON schema for flashcard array
5. Call `createChatCompletion()` with structured response
6. Extract and return flashcards array

#### Step 3.3: Add Utility Methods (Optional)

1. `listAvailableModels()`: Fetch available models from OpenRouter
2. `estimateCost()`: Calculate estimated cost for a request
3. `getModelInfo()`: Get details about a specific model

### Phase 4: Testing and Validation (2-3 hours)

#### Step 4.1: Unit Tests

1. Test constructor with valid config
2. Test constructor throws without API key
3. Test request validation for various invalid inputs
4. Test request builder correctly formats requests
5. Test error handler maps status codes correctly
6. Test response parser handles various JSON formats
7. Mock fetch to test success and error scenarios

#### Step 4.2: Integration Tests

1. Test basic chat completion with real API (use dev key)
2. Test structured JSON response
3. Test flashcard generation
4. Test error handling with invalid API key
5. Test timeout handling
6. Test rate limiting behavior

#### Step 4.3: Edge Case Testing

1. Test with very long input text
2. Test with special characters in input
3. Test with malformed JSON in response
4. Test with network failures
5. Test with various model names

### Phase 5: Documentation and Refinement (1-2 hours)

#### Step 5.1: Code Documentation

1. Add JSDoc comments to all public methods
2. Document all parameters with @param
3. Document return values with @returns
4. Document thrown errors with @throws
5. Add usage examples in comments

#### Step 5.2: README/Guide

1. Create usage guide in `src/lib/services/README.md`
2. Document configuration options
3. Provide code examples for common use cases
4. Document error codes and handling
5. Add troubleshooting section

#### Step 5.3: Type Exports

1. Export all public interfaces
2. Export OpenRouterError class
3. Create barrel export in `src/lib/services/index.ts`

### Phase 6: Security Review (1 hour)

#### Step 6.1: Security Checklist

- [ ] API key is never exposed to client-side code
- [ ] API key is never logged or included in error messages
- [ ] Input validation prevents injection attacks
- [ ] Request timeouts are properly configured
- [ ] Error messages don't expose internal details
- [ ] Rate limiting is considered
- [ ] Response validation prevents malicious content
- [ ] All user input is sanitized

#### Step 6.2: Security Testing

1. Test that API key is not in client bundles
2. Test input sanitization works correctly
3. Test error messages don't leak sensitive data
4. Review all console.log statements for sensitive data

### Phase 7: Integration with Existing Codebase (2-3 hours)

#### Step 7.1: Refactor Existing Service

1. Review current `open-router.service.ts` implementation
2. Migrate `generateFlashcards()` function to class method
3. Replace direct fetch calls with service class
4. Update error handling to use OpenRouterError
5. Add structured responses with JSON schema

#### Step 7.2: Update API Endpoints

1. Update `src/pages/api/generations/index.ts`
2. Instantiate OpenRouterService
3. Call service methods instead of direct functions
4. Update error handling to work with OpenRouterError

#### Step 7.3: Update Type Definitions

1. Update `src/types.ts` if needed
2. Remove duplicate interfaces
3. Ensure consistency across codebase

### Phase 8: Final Testing and Deployment (1-2 hours)

#### Step 8.1: End-to-End Testing

1. Test complete flashcard generation flow
2. Verify generation API endpoint works
3. Test error scenarios in production-like environment
4. Verify logging and monitoring

#### Step 8.2: Performance Testing

1. Measure response times
2. Test with concurrent requests
3. Verify timeout handling under load
4. Check memory usage

#### Step 8.3: Deployment Preparation

1. Update environment variables in deployment config
2. Review and update documentation
3. Create migration guide if needed
4. Plan rollout strategy

---

## Summary

This implementation plan provides a comprehensive guide for building a robust, type-safe OpenRouter service for your Astro + TypeScript application. The service will:

- ✅ Provide a clean, object-oriented interface for OpenRouter API
- ✅ Support structured JSON responses via JSON Schema
- ✅ Include comprehensive error handling with custom error types
- ✅ Implement security best practices for API key management
- ✅ Offer flexibility through configurable parameters
- ✅ Maintain type safety throughout the codebase
- ✅ Enable easy testing through dependency injection
- ✅ Provide specialized methods for common use cases (flashcard generation)

**Total estimated implementation time**: 12-20 hours

**Key deliverables**:
1. Fully implemented `OpenRouterService` class
2. Comprehensive error handling with `OpenRouterError`
3. Type-safe interfaces for all operations
4. Unit and integration tests
5. Documentation and usage examples
6. Security review and validation

Follow this plan sequentially, completing each phase before moving to the next. This ensures a solid foundation and reduces the need for refactoring later.
