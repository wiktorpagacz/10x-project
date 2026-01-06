# API Endpoint Implementation Plan: PUT /flashcards/{id}

## 1. Endpoint Overview

The `PUT /flashcards/{id}` endpoint enables authenticated users to update an existing flashcard they own. Users can modify the `front` (question) and/or `back` (answer) fields of a flashcard. The endpoint returns the complete, updated flashcard object on success.

**Purpose**: Provide a standard RESTful interface for flashcard modifications, ensuring data consistency and proper ownership validation.

---

## 2. Request Details

- **HTTP Method**: `PUT`
- **URL Structure**: `/api/flashcards/{id}`
- **File Path**: `src/pages/api/flashcards/[id].ts`
- **Request Body**: JSON object conforming to the `UpdateFlashcardCommand` type (with API spec constraints).

### Parameters

#### Path Parameters
- **`id`** (number): The unique identifier of the flashcard to update. Must be a positive integer.

#### Request Body
- **`front`** (string, optional): The updated question or prompt side of the flashcard. Must be 1–200 characters if provided.
- **`back`** (string, optional): The updated answer side of the flashcard. Must be 1–500 characters if provided.
- **Constraint**: At least one of `front` or `back` must be provided. An empty body or a body with no meaningful updates will result in a `400 Bad Request`.

#### Authentication
- **Required**: Valid user session (derived from Astro middleware via `Astro.locals.session`).

### Example Request

```http
PUT /api/flashcards/123 HTTP/1.1
Content-Type: application/json

{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```

Or a partial update:

```http
PUT /api/flashcards/123 HTTP/1.1
Content-Type: application/json

{
  "front": "What is the capital of France?"
}
```

---

## 3. Used Types

The implementation will use the following types defined in `src/types.ts`:

- **Command Model**: `UpdateFlashcardCommand` — Validates the request structure. For this endpoint, only `front` and `back` are modifiable; `source` and `generation_id` cannot be updated via this endpoint and should be rejected if provided.
- **Output DTO**: `FlashcardDto` — The public-facing representation of the updated flashcard, excluding sensitive fields like `user_id` and `fts_vector`.
- **Base Type**: `Flashcard` — The complete database row type for type-safe operations.

---

## 4. Response Details

### Success Response (200 OK)

**Condition**: The request is valid, the flashcard is found, the user owns the flashcard, and the database update is successful.

**Payload**: A `FlashcardDto` object representing the complete, updated flashcard.

**Example Response**:
```json
{
  "id": 123,
  "generation_id": null,
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "created_at": "2025-10-26T16:30:00+00:00",
  "updated_at": "2026-01-05T14:22:15+00:00"
}
```

### Error Responses

- **400 Bad Request**:
  - Invalid JSON payload structure.
  - Invalid or malformed `id` path parameter (e.g., non-numeric).
  - `front` or `back` field exceeds length constraints (>200 or >500 characters respectively).
  - `front` is provided but empty after trimming.
  - `back` is provided but empty after trimming.
  - Neither `front` nor `back` is provided (empty update payload).
  - Attempting to update fields other than `front` and `back` (e.g., `source`, `generation_id`, `created_at`).

**Example Response**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "front",
      "message": "Must be between 1 and 200 characters"
    }
  ]
}
```

- **401 Unauthorized**:
  - The request lacks a valid authentication session.

**Example Response**:
```json
{
  "error": "Unauthorized"
}
```

- **403 Forbidden**:
  - The authenticated user does not own the flashcard (RLS violation or explicit ownership check failure).

**Example Response**:
```json
{
  "error": "Forbidden. You do not have permission to update this flashcard."
}
```

- **404 Not Found**:
  - The flashcard with the provided `id` does not exist in the database.

**Example Response**:
```json
{
  "error": "Flashcard not found"
}
```

- **500 Internal Server Error**:
  - A database error occurs during the update operation (e.g., connection failure, constraint violation).
  - An unexpected server-side error occurs.

**Example Response**:
```json
{
  "error": "An internal server error occurred. Please try again later."
}
```

---

## 5. Data Flow

1. A `PUT` request is made to `/api/flashcards/{id}` with a JSON body containing the updated fields.
2. Astro middleware verifies the user's session. If invalid or missing, the request is rejected with a `401` status.
3. The `PUT` handler in `src/pages/api/flashcards/[id].ts` is executed.
4. The handler extracts and validates the `id` path parameter:
   - If `id` is not a valid positive integer, a `400` response is returned.
5. The handler retrieves the Supabase client and user ID from `Astro.locals`.
6. The handler parses the request body and validates it using a Zod schema:
   - If validation fails (invalid JSON, constraint violations, etc.), a `400` response is returned with detailed error information.
7. The handler calls the `flashcardService.updateFlashcard()` method, passing:
   - The Supabase client
   - The authenticated user's ID
   - The flashcard ID
   - The validated update data (`front` and/or `back`)
8. **Inside `flashcardService.updateFlashcard()`**:
   - The service first fetches the flashcard by ID to verify existence and ownership.
   - If the flashcard does not exist, the service returns `null` (handler converts to `404`).
   - If the flashcard exists but belongs to a different user, the service returns a special error or `null` with ownership context (handler converts to `403`).
   - The service constructs an update payload with only the provided fields.
   - The service executes the update operation via `supabase.from('flashcards').update(...).eq('id', id).eq('user_id', userId).select()`.
   - The `select()` clause ensures the updated record is returned.
   - If a database error occurs, the service throws an error with appropriate context.
9. The API handler receives the updated `FlashcardDto` object from the service.
10. The API handler returns a `200 OK` response with the updated flashcard as the JSON body.
11. In the `catch` block, if any error occurs, it is logged with context (user ID, flashcard ID, error details), and an appropriate error response is returned:
    - Ownership violations return `403`.
    - Not found errors return `404`.
    - Unexpected errors return `500`.

---

## 6. Security Considerations

### Authentication
- The endpoint is protected by Astro middleware that verifies the user's session. Only authenticated requests are processed.
- The `user_id` is always derived from `Astro.locals.session`, ensuring operations are scoped to the authenticated user.

### Authorization
- Before updating a flashcard, the handler verifies that the flashcard belongs to the authenticated user by checking `user_id` against the authenticated session.
- The Supabase query includes an explicit `eq('user_id', userId)` filter to ensure only the authenticated user's flashcard is updated. If no rows match, the update returns no results (converting to `404`).
- Supabase Row-Level Security (RLS) policies on the `flashcards` table provide an additional layer of protection at the database level.

### Input Validation
- A Zod schema enforces strict validation of the request payload:
  - `id` (path parameter) must be a positive integer.
  - `front` (if provided) must be a non-empty string between 1 and 200 characters.
  - `back` (if provided) must be a non-empty string between 1 and 500 characters.
  - At least one of `front` or `back` must be provided.
  - No other fields are allowed in the request body; extra fields are rejected.
- Validation happens before any database operations, preventing invalid data from reaching the database.

### Data Integrity
- The `updated_at` timestamp is automatically updated by a database trigger (as specified in the schema), ensuring accurate modification timestamps without relying on client-provided values.
- Only `front` and `back` are updatable via this endpoint. Critical fields like `user_id`, `generation_id`, `source`, `created_at`, and `fts_vector` cannot be modified through this endpoint, preventing accidental or malicious tampering.
- The `fts_vector` (full-text search vector) is automatically regenerated by a database trigger when `front` or `back` changes, ensuring search results remain accurate.

### Rate Limiting
- If rate limiting has been implemented in the Astro middleware, it should apply to this endpoint as well (e.g., 20 requests per user per minute for update operations).

---

## 7. Error Handling

### Validation Errors (400 Bad Request)
**Scenario**: The request payload fails Zod validation.
- **Cause**: Invalid JSON, missing fields, incorrect field types, values outside allowed ranges, or invalid path parameter format.
- **Handling**:
  1. Catch the Zod validation error.
  2. Extract field-level error details from the Zod error object.
  3. Log the error for debugging purposes (non-sensitive details only).
  4. Return a `400` response with structured error details.

**Example Error Response**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "Invalid ID format. Must be a positive integer."
    },
    {
      "field": "front",
      "message": "Must be between 1 and 200 characters"
    }
  ]
}
```

### Flashcard Not Found (404 Not Found)
**Scenario**: The flashcard with the provided `id` does not exist.
- **Cause**: User provides an invalid or non-existent flashcard ID.
- **Handling**:
  1. The service query returns no rows (update returns 0 affected rows).
  2. The handler detects the empty result set.
  3. Log the attempt with the user ID and flashcard ID for debugging.
  4. Return a `404` response.

**Example Error Response**:
```json
{
  "error": "Flashcard not found"
}
```

### Ownership Violation (403 Forbidden)
**Scenario**: The flashcard exists but belongs to a different user.
- **Cause**: User attempts to update a flashcard they do not own.
- **Handling**:
  1. The service's ownership check detects the mismatch.
  2. The service either returns `null` with context or throws a custom error.
  3. The handler catches the error or detects the `null` result.
  4. Log the attempt with the user ID and flashcard ID for security monitoring.
  5. Return a `403` response without revealing whether the flashcard exists (security best practice).

**Example Error Response**:
```json
{
  "error": "Forbidden. You do not have permission to update this flashcard."
}
```

### Database Errors (500 Internal Server Error)
**Scenario**: An unexpected database error occurs during the update operation.
- **Cause**: Connection failure, constraint violation (rare given input validation), disk full, or other database-level issues.
- **Handling**:
  1. Catch the database error in the `catch` block.
  2. Log the full error details with context (user ID, flashcard ID, request payload summary).
  3. Return a generic `500` response to the client (do not expose internal error details).

**Example Error Response**:
```json
{
  "error": "An internal server error occurred. Please try again later."
}
```

### Unauthorized (401 Unauthorized)
**Scenario**: The request lacks a valid authentication session.
- **Cause**: No session cookie, expired token, or invalid token.
- **Handling**: Astro middleware intercepts the request and returns a `401` before the handler is invoked.

---

## 8. Performance Considerations

### Primary Bottleneck
The main performance factor is the database update operation. However, this is highly optimized:
- **Single Query Update**: Supabase's `.update().eq().select()` performs an efficient UPDATE statement with a WHERE clause, retrieving the updated row in a single database round-trip.
- **Ownership Filter**: The `eq('user_id', userId)` filter is indexed (B-Tree index on `user_id`), ensuring fast row identification.
- **Automatic Trigger Update**: The `updated_at` timestamp and `fts_vector` are automatically updated by database triggers, avoiding additional application-level queries.

### Expected Performance
- **Typical request**: < 100 ms (depending on network latency and database load).
- **Cold database connection**: < 500 ms (initial connection establishment).

### Optimization Strategies
1. **Efficient Filtering**: The combination of indexed `id` (primary key) and `user_id` (index) ensures sub-millisecond row lookups.
2. **Minimal Data Transfer**: Only the requested fields are updated, reducing payload size and transaction time.
3. **Connection Pooling**: Supabase provides connection pooling, ensuring efficient use of database connections.
4. **Batch Updates**: If this endpoint is frequently called for bulk updates, consider a batch variant (though not part of this spec).

### Monitoring Recommendations
- Monitor the response time of the endpoint under typical load.
- Log database query times to identify potential bottlenecks.
- Alert if update operations exceed 1 second (indicating database congestion or other issues).
- Track error rates to detect authorization or validation issues.

---

## 9. Implementation Steps

### Step 1: Create Validation Schema
In `src/pages/api/flashcards/[id].ts`, create a Zod schema for validating the request:

```typescript
import { z } from 'zod';

const updateFlashcardSchema = z.object({
  front: z.string().min(1).max(200).optional(),
  back: z.string().min(1).max(500).optional(),
}).refine(
  (data) => data.front !== undefined || data.back !== undefined,
  {
    message: "At least one of 'front' or 'back' must be provided",
    path: ['body'],
  }
).strict(); // Reject unknown fields

const pathParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().positive()),
});
```

### Step 2: Create or Extend Flashcard Service
Create or extend `src/lib/services/flashcardService.ts` with the following method signature:

```typescript
export async function updateFlashcard(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number,
  data: {
    front?: string;
    back?: string;
  }
): Promise<FlashcardDto | null>
```

### Step 3: Implement Core Service Logic
Implement the `updateFlashcard` function with the following logic:

```typescript
export async function updateFlashcard(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number,
  data: { front?: string; back?: string }
): Promise<FlashcardDto | null> {
  // Step 1: Fetch the existing flashcard to verify ownership
  const { data: existingFlashcard, error: fetchError } = await supabase
    .from('flashcards')
    .select('id, user_id')
    .eq('id', flashcardId)
    .single();

  // Handle not found
  if (fetchError?.code === 'PGRST116') { // No rows found
    return null;
  }

  // Propagate unexpected fetch errors
  if (fetchError) {
    throw new Error(`Failed to fetch flashcard: ${fetchError.message}`);
  }

  // Step 2: Verify ownership
  if (existingFlashcard.user_id !== userId) {
    throw new Error('OWNERSHIP_VIOLATION'); // Custom error for 403 handling
  }

  // Step 3: Build update payload (only include provided fields)
  const updatePayload: Record<string, unknown> = {};
  if (data.front !== undefined) updatePayload.front = data.front;
  if (data.back !== undefined) updatePayload.back = data.back;

  // Step 4: Perform the update and retrieve the complete updated record
  const { data: updatedFlashcard, error: updateError } = await supabase
    .from('flashcards')
    .update(updatePayload)
    .eq('id', flashcardId)
    .eq('user_id', userId) // Ensure user_id matches (double-check for safety)
    .select('id, generation_id, front, back, source, created_at, updated_at')
    .single();

  // Handle update errors
  if (updateError) {
    throw new Error(`Failed to update flashcard: ${updateError.message}`);
  }

  return updatedFlashcard as FlashcardDto;
}
```

### Step 4: Create the API Handler
Create `src/pages/api/flashcards/[id].ts` with a `PUT` handler:

```typescript
import type { APIContext } from 'astro';
import { z } from 'zod';
import { updateFlashcard } from 'src/lib/services/flashcardService';

export const prerender = false;

const updateFlashcardSchema = z.object({
  front: z.string().min(1).max(200).optional(),
  back: z.string().min(1).max(500).optional(),
}).refine(
  (data) => data.front !== undefined || data.back !== undefined,
  { message: "At least one of 'front' or 'back' must be provided" }
).strict();

const pathParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().positive()),
});

export async function PUT(context: APIContext) {
  try {
    // Step 1: Validate path parameter
    const pathParams = pathParamSchema.safeParse({
      id: context.params.id,
    });

    if (!pathParams.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: pathParams.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id: flashcardId } = pathParams.data;

    // Step 2: Get user from session
    const { session } = context.locals;
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;

    // Step 3: Parse and validate request body
    const body = await context.request.json().catch(() => null);
    const bodyValidation = updateFlashcardSchema.safeParse(body);

    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.') || 'body',
            message: e.message,
          })),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Call service to update flashcard
    const supabase = context.locals.supabase;
    const updatedFlashcard = await updateFlashcard(
      supabase,
      userId,
      flashcardId,
      bodyValidation.data
    );

    // Step 5: Handle not found
    if (!updatedFlashcard) {
      return new Response(
        JSON.stringify({ error: 'Flashcard not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Return success response
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Step 7: Handle ownership violations
    if (error instanceof Error && error.message === 'OWNERSHIP_VIOLATION') {
      return new Response(
        JSON.stringify({
          error: 'Forbidden. You do not have permission to update this flashcard.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 8: Log and handle unexpected errors
    console.error('PUT /api/flashcards/[id] error:', {
      userId: context.locals.session?.user.id,
      flashcardId: context.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: 'An internal server error occurred. Please try again later.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Step 5: Update Type Definitions (if needed)
Review `src/types.ts` to ensure `UpdateFlashcardCommand` and related types match the API spec. If necessary, create a more specific type for this endpoint:

```typescript
/**
 * Command model for updating an existing flashcard (`PUT /flashcards/{id}`).
 * Only `front` and `back` fields are updatable; `source` and `generation_id` are read-only.
 * At least one field must be provided.
 */
export type UpdateFlashcardDto = Partial<{
  front: string;
  back: string;
}>;
```

### Step 6: Test the Endpoint
Create test cases covering:
- Valid update with both `front` and `back`.
- Valid update with only `front`.
- Valid update with only `back`.
- Invalid `id` (non-numeric, negative, etc.).
- Empty request body.
- Missing authentication.
- Flashcard not found.
- Ownership violation (user tries to update another user's flashcard).
- Database error simulation (optional, if using mock Supabase).

---

## 10. Comparison with Existing Patterns

This implementation follows the same patterns as the `POST /api/flashcards/batch` endpoint (referenced as #file:flashcards-batch-implementation-plan.md):

- **Validation**: Zod schema for strict input validation.
- **Service Layer**: Extracted logic to `flashcardService`.
- **Error Handling**: Structured error responses with appropriate status codes.
- **Security**: User ID derivation from session, ownership verification, RLS as additional layer.
- **Performance**: Single database round-trip using `.select()`.
- **Logging**: Error context logged for debugging and monitoring.

Key differences:
- This endpoint performs a **partial update** (optional fields) rather than a **creation**.
- The response is a **single object** (FlashcardDto) rather than an array.
- **Path parameter validation** is required in addition to body validation.
- **404 Not Found** is a possible response (distinct from 403).

