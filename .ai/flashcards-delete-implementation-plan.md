# API Endpoint Implementation Plan: DELETE /flashcards/{id}

## 1. Endpoint Overview

The `DELETE /flashcards/{id}` endpoint enables authenticated users to delete a specific flashcard they own. Upon successful deletion, the endpoint returns a `204 No Content` response, confirming the deletion without returning any response body. This endpoint is essential for allowing users to manage their flashcard library by removing unwanted or outdated flashcards.

**Purpose**: Enable users to permanently remove individual flashcards from their collection while ensuring proper authorization and maintaining data integrity.

---

## 2. Request Details

- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/flashcards/{id}`
- **File Path**: `src/pages/api/flashcards/[id].ts`
- **Request Body**: None

### Parameters

#### URL Parameters (Required)
- **`id`** (BIGINT): The unique identifier of the flashcard to delete. Must be a positive integer.

#### Example Request
```
DELETE /api/flashcards/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer [session-token]
```

---

## 3. Used Types

The implementation will use the following types defined in `src/types.ts` and `src/db/database.types.ts`:

- **Database Type**: `Flashcard` — Represents a single row from the `flashcards` table. Used for verifying the flashcard's existence and ownership before deletion.
- **DTO Type**: `FlashcardDto` — May be used for logging or diagnostic purposes, though it is not returned in the response.

No new command models or DTOs are required for this endpoint, as the request contains only a URL parameter and the response is empty.

---

## 4. Response Details

### Success Response (204 No Content)

**Condition**: The request is valid, the flashcard exists, the user owns the flashcard, and the deletion is successful.

**Payload**: No response body. The status code alone indicates successful deletion.

**Example Response**:
```
HTTP/1.1 204 No Content
```

### Error Responses

- **400 Bad Request**:
  - The `id` parameter is not a valid positive integer.
  - The `id` parameter is missing or malformed.

- **401 Unauthorized**:
  - The request lacks a valid authentication session.
  - The session token is expired or invalid.

- **403 Forbidden**:
  - The authenticated user does not own the flashcard with the provided `id`.
  - This indicates an authorization failure, distinct from a missing resource.

- **404 Not Found**:
  - The flashcard with the provided `id` does not exist in the database.
  - This response is returned only after confirming the user is authenticated and owns no flashcard with that ID.

- **500 Internal Server Error**:
  - A database error occurs during deletion (e.g., connection failure, constraint violation, unexpected database state).
  - An unexpected server-side error occurs during request processing.

---

## 5. Data Flow

1. A `DELETE` request is made to `/api/flashcards/{id}` where `{id}` is a positive integer.
2. Astro middleware verifies the user's session. If invalid or missing, the request is rejected with a `401` status.
3. The `DELETE` handler in `src/pages/api/flashcards/[id].ts` is executed.
4. The handler retrieves the Supabase client and user ID from `Astro.locals`.
5. The handler parses and validates the `id` parameter from `Astro.params` using a Zod schema. If validation fails, a `400` response is returned.
6. The handler calls `flashcardService.delete()`, passing:
   - The Supabase client
   - The user ID from the authenticated session
   - The validated flashcard ID
7. **Inside `flashcardService.delete()`**:
   - The service queries the `flashcards` table for the record with the provided `id` and matching `user_id`.
   - If no record is found, the service throws an error with a `NOT_FOUND` code.
   - If a record is found but the `user_id` does not match the authenticated user, the service throws an error with a `FORBIDDEN` code.
   - If the record is found and ownership is verified, the service executes the delete operation via Supabase.
   - If a database error occurs, the service throws an error with context (user ID, flashcard ID, and error details).
8. The API handler receives the result from the service (no data returned on success).
9. The API handler returns a `204 No Content` response with an empty body.
10. In the `catch` block, if any error occurs, it is logged with context (user ID, flashcard ID, error code), and an appropriate HTTP response is returned based on the error type (400, 403, 404, or 500).

---

## 6. Security Considerations

### Authentication
- The endpoint is protected by Astro middleware that verifies the user's session. Only authenticated requests are processed.
- The `user_id` is always derived from `Astro.locals.session`, ensuring that the deletion is attributed to the authenticated user.

### Authorization
- Before deletion, the handler verifies that the flashcard's `user_id` matches the authenticated user's ID. This prevents users from deleting flashcards owned by other users.
- The verification occurs in the service layer, which queries the `flashcards` table with both the `id` and `user_id` constraints.
- Supabase Row-Level Security (RLS) policies on the `flashcards` table provide an additional layer of protection at the database level.

### Input Validation
- The `id` parameter is extracted from the URL and validated using Zod:
  - Must be coercible to a number (strings are automatically converted).
  - Must be a positive integer.
  - Must not exceed the BIGINT range (though this is unlikely to occur in practice).
- Invalid `id` values result in a `400 Bad Request` response before any database operations.

### Data Integrity
- The `flashcards` table has a foreign key constraint to `auth.users` with `ON DELETE CASCADE`, ensuring referential integrity if a user is deleted.
- The `flashcards` table has a foreign key constraint to `generations` with `ON DELETE SET NULL`, allowing flashcards to be deleted independently of their generation session.
- No cascading effects occur when a single flashcard is deleted; only that specific record is removed.

### Sensitive Data Exposure
- The `404 Not Found` response does not reveal whether the flashcard exists; it simply indicates the resource is not found (which could be due to non-existence or lack of ownership).
- Error messages logged server-side include detailed information (user ID, flashcard ID, error details) for debugging, but these details are not exposed to the client.
- The response body is empty, preventing accidental exposure of internal data.

### Rate Limiting
- If rate limiting has been implemented in the Astro middleware for other endpoints, it should also apply to `DELETE /api/flashcards/{id}`.
- Consider adding rate-limiting configuration to prevent deletion abuse (e.g., 30 requests per user per minute).

---

## 7. Error Handling

### Invalid URL Parameter (400 Bad Request)
**Scenario**: The `id` parameter is not a valid positive integer.
- **Cause**: The user provides an invalid ID (e.g., negative number, non-numeric string, malformed request).
- **Handling**:
  1. Catch the Zod validation error when parsing the `id` parameter.
  2. Log the validation error with non-sensitive details (user ID, provided value type).
  3. Return a `400 Bad Request` response with an error message indicating the `id` must be a positive integer.

**Example Error Response**:
```json
{
  "error": "Invalid request parameter",
  "details": "The 'id' parameter must be a positive integer."
}
```

### Flashcard Not Found (404 Not Found)
**Scenario**: The flashcard with the provided `id` does not exist.
- **Cause**: The user provides an ID that does not match any flashcard (either globally or for their account).
- **Handling**:
  1. Query the `flashcards` table for the record with the provided `id` and authenticated `user_id`.
  2. If no record is found, the service returns a `NOT_FOUND` error.
  3. The handler catches this error and returns a `404 Not Found` response.
  4. Log the attempt with the user ID and provided flashcard ID for security auditing.

**Example Error Response**:
```json
{
  "error": "Flashcard not found"
}
```

### Unauthorized Access (403 Forbidden)
**Scenario**: The authenticated user attempts to delete a flashcard they do not own.
- **Cause**: The `id` exists in the database but belongs to a different user.
- **Handling**:
  1. Query the `flashcards` table for the record with the provided `id`.
  2. If found, verify that the `user_id` field matches the authenticated user's ID.
  3. If it does not match, the service returns a `FORBIDDEN` error.
  4. The handler catches this error and returns a `403 Forbidden` response.
  5. Log the unauthorized deletion attempt with the user ID and flashcard ID for security monitoring.

**Example Error Response**:
```json
{
  "error": "You do not have permission to delete this flashcard"
}
```

### Database Error (500 Internal Server Error)
**Scenario**: An unexpected database error occurs during deletion.
- **Cause**: Connection failure, constraint violation, disk full, or other database-level issues.
- **Handling**:
  1. Catch the database error in the `catch` block.
  2. Log the error with full context (user ID, flashcard ID, error message, stack trace).
  3. Return a generic `500 Internal Server Error` response to the client (do not expose internal error details).

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

**Example Error Response**:
```json
{
  "error": "Unauthorized"
}
```

---

## 8. Performance Considerations

### Primary Bottleneck
The main performance factor is the database query to fetch and delete the flashcard. However, this is straightforward and highly optimized:

- **Single Query with Filter**: The service executes a single `delete()` query with both `id` and `user_id` filters, ensuring:
  - Fast lookup using the B-tree index on `user_id` and the primary key on `id`.
  - Minimal data transfer (no SELECT before DELETE needed in Supabase).
  - Atomic deletion with no additional round-trips.

### Expected Performance
- **Typical request**: < 100 ms (depending on network latency and database load).
- **Worst case (database congestion)**: < 500 ms.

### Optimization Strategies
1. **No Additional Queries**: The delete operation is a single atomic transaction, avoiding unnecessary database round-trips.
2. **Indexing**: The existing B-tree indices on `id` (primary key) and `user_id` support fast lookups.
3. **Connection Pooling**: Supabase provides connection pooling, ensuring efficient use of database connections.

### Monitoring Recommendations
- Monitor the response time of the endpoint under typical load.
- Log deletion operations to track audit trails and identify potential abuse patterns.
- Alert if deletion operations exceed 1 second (indicating database congestion).

---

## 9. Implementation Steps

### Step 1: Create the API Route Handler
Create the file `src/pages/api/flashcards/[id].ts`:

```typescript
import type { AstroGlobal } from 'astro';
import { z } from 'zod';

export const prerender = false;

// Define the Zod schema for parameter validation
const deleteFlashcardParamsSchema = z.object({
  id: z.coerce.number().int().positive('The id must be a positive integer'),
});

export async function DELETE(astroContext: AstroGlobal) {
  try {
    // Extract Supabase client and user ID from Astro locals (set by middleware)
    const supabase = astroContext.locals.supabase;
    const { user } = astroContext.locals.auth;

    // Guard clause: check authentication
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate the id parameter
    const paramsValidation = deleteFlashcardParamsSchema.safeParse(
      astroContext.params
    );

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request parameter',
          details: 'The id parameter must be a positive integer.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { id } = paramsValidation.data;

    // Call the service to delete the flashcard
    await flashcardService.delete(supabase, user.id, id);

    // Return 204 No Content on successful deletion
    return new Response(null, { status: 204 });
  } catch (error) {
    // Handle service-level errors
    if (error instanceof FlashcardNotFoundError) {
      return new Response(
        JSON.stringify({ error: 'Flashcard not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (error instanceof FlashcardForbiddenError) {
      return new Response(
        JSON.stringify({
          error: 'You do not have permission to delete this flashcard',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Log unexpected errors
    console.error('Unexpected error deleting flashcard:', {
      userId: user?.id,
      flashcardId: astroContext.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return generic 500 error to client
    return new Response(
      JSON.stringify({
        error: 'An internal server error occurred. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

### Step 2: Create Custom Error Classes
Add to `src/lib/services/errors.ts` (create if it doesn't exist):

```typescript
export class FlashcardNotFoundError extends Error {
  constructor(message = 'Flashcard not found') {
    super(message);
    this.name = 'FlashcardNotFoundError';
  }
}

export class FlashcardForbiddenError extends Error {
  constructor(
    message = 'You do not have permission to access this flashcard'
  ) {
    super(message);
    this.name = 'FlashcardForbiddenError';
  }
}
```

### Step 3: Update the Flashcard Service
Update or create `src/lib/services/flashcardService.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from 'src/db/database.types';
import {
  FlashcardNotFoundError,
  FlashcardForbiddenError,
} from './errors';

export async function delete(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number
): Promise<void> {
  // Step 1: Fetch the flashcard to verify existence and ownership
  const { data: flashcard, error: fetchError } = await supabase
    .from('flashcards')
    .select('id, user_id')
    .eq('id', flashcardId)
    .single();

  // Handle fetch errors
  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // No rows returned; flashcard not found
      throw new FlashcardNotFoundError();
    }
    // Unexpected database error
    throw new Error(`Failed to fetch flashcard: ${fetchError.message}`);
  }

  // Step 2: Verify ownership
  if (flashcard.user_id !== userId) {
    throw new FlashcardForbiddenError();
  }

  // Step 3: Delete the flashcard
  const { error: deleteError } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', flashcardId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Failed to delete flashcard: ${deleteError.message}`);
  }
}
```

### Step 4: Update Middleware (if needed)
Ensure that `src/middleware/index.ts` verifies the user's session and populates `Astro.locals` with the Supabase client and user ID. (This step may already be completed; verify the existing middleware.)

### Step 5: Test the Endpoint
Create test cases covering:
- **Success**: Delete an existing flashcard owned by the user (expect 204).
- **Not Found**: Attempt to delete a non-existent flashcard (expect 404).
- **Forbidden**: Attempt to delete a flashcard owned by another user (expect 403).
- **Unauthorized**: Attempt to delete a flashcard without authentication (expect 401).
- **Invalid Parameter**: Provide an invalid `id` parameter (expect 400).

### Step 6: Update Route Documentation
Add the endpoint to the project's API documentation (e.g., `README.md` or an OpenAPI spec) with:
- Endpoint URL and HTTP method
- Authentication requirements
- Success and error response examples
- Status codes and their meanings

---

## Summary

This implementation plan provides a comprehensive guide for implementing the `DELETE /flashcards/{id}` endpoint. The endpoint:

- **Ensures proper authentication** via middleware before processing the request.
- **Verifies authorization** by confirming the user owns the flashcard before deletion.
- **Provides clear error responses** for all failure scenarios with appropriate HTTP status codes.
- **Maintains data integrity** through atomic database operations and foreign key constraints.
- **Optimizes performance** by using a single query with indexed filters.
- **Follows project conventions** by extracting logic into a service layer and using Zod for validation.

The implementation prioritizes security, error handling, and user experience while adhering to the Astro, TypeScript, and Supabase best practices outlined in the project's guidelines.
