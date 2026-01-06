# API Endpoint Implementation Plan: GET /flashcards/{id}

## 1. Endpoint Overview

The `GET /flashcards/{id}` endpoint enables authenticated users to retrieve a single flashcard by its unique identifier. This endpoint is used when displaying individual flashcard details, such as during review sessions or when accessing a specific flashcard from the user's library. The endpoint accepts a flashcard ID as a path parameter, verifies that the flashcard belongs to the authenticated user, and returns the flashcard's complete data excluding sensitive fields like `user_id` and the full-text search vector.

**Purpose**: Provide a simple, efficient mechanism for authenticated users to retrieve and view a specific flashcard they own.

---

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/flashcards/{id}`
- **File Path**: `src/pages/api/flashcards/[id].ts`
- **Request Body**: None
- **Request Payload**: No JSON body required

### Parameters

#### Path Parameters
- **`id`** (required): The unique identifier of the flashcard to retrieve. Must be a positive integer (BIGINT). If the ID cannot be parsed as a number or is not a positive integer, the endpoint returns a `400 Bad Request` response.

#### Query Parameters
None.

#### Request Headers
- **Authentication**: Implicit through Astro middleware session verification. No explicit headers required in the request.

### Example Request
```
GET /api/flashcards/42 HTTP/1.1
Host: example.com
Cookie: session=<valid-session-token>
```

---

## 3. Used Types

The implementation will use the following types defined in `src/types.ts`:

- **DTO Type**: `FlashcardDto` — The public-facing representation of a flashcard, excluding sensitive fields (`user_id` and `fts_vector`). This type is a mapped type that extends the `Flashcard` type.
- **Database Type**: `Flashcard` — The complete flashcard row type from the `flashcards` table, used for type safety when interacting with the database.

No new types are required beyond the existing `FlashcardDto` definition.

---

## 4. Response Details

### Success Response (200 OK)

**Condition**: The request is valid, the flashcard exists, and it belongs to the authenticated user.

**Payload**: A single `FlashcardDto` object representing the requested flashcard.

**Example Response**:
```json
{
  "id": 42,
  "front": "What is REST?",
  "back": "Representational State Transfer is an architectural style for designing networked applications.",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-11-02T10:00:00Z",
  "updated_at": "2025-11-02T10:00:00Z"
}
```

**Response Headers**:
- `Content-Type: application/json`
- `Cache-Control: private, no-cache` (recommended to prevent caching of user-specific data)

### Error Responses

- **400 Bad Request**:
  - The `id` path parameter is not a valid positive integer.
  - **Response Body**:
    ```json
    {
      "error": "Invalid flashcard ID format"
    }
    ```

- **401 Unauthorized**:
  - The request lacks a valid authentication session.
  - Handled by Astro middleware before the endpoint handler is invoked.
  - **Response Body**:
    ```json
    {
      "error": "Unauthorized"
    }
    ```

- **404 Not Found**:
  - No flashcard with the given ID exists for the authenticated user.
  - This includes scenarios where the ID is valid but does not correspond to any flashcard, or the flashcard belongs to another user (due to Row-Level Security).
  - **Response Body**:
    ```json
    {
      "error": "Flashcard not found"
    }
    ```

- **500 Internal Server Error**:
  - A database error occurs during the query (e.g., connection failure, timeout).
  - An unexpected server-side error occurs.
  - **Response Body**:
    ```json
    {
      "error": "An internal server error occurred. Please try again later."
    }
    ```

---

## 5. Data Flow

1. A `GET` request is made to `/api/flashcards/{id}`, where `{id}` is a path parameter.
2. Astro middleware intercepts the request and verifies the user's session. If invalid or missing, the request is rejected with a `401` status before the handler is invoked.
3. The `GET` handler in `src/pages/api/flashcards/[id].ts` is executed.
4. The handler extracts and validates the `id` path parameter:
   - Parses the `id` as an integer.
   - If parsing fails or the value is not a positive integer, a `400 Bad Request` response is returned.
5. The handler retrieves the Supabase client and user ID from `Astro.locals`.
6. The handler calls the `flashcardService.getById()` method, passing:
   - The Supabase client
   - The authenticated user ID
   - The validated `id`
7. **Inside `flashcardService.getById()`**:
   - The service queries the `flashcards` table for a row matching the given `id` and `user_id`.
   - Supabase Row-Level Security (RLS) policies ensure that only flashcards belonging to the authenticated user are accessible.
   - If a matching row is found, it is returned as a `FlashcardDto` (sensitive fields are already excluded by the database schema or the service method).
   - If no matching row is found, the service throws a `NotFoundError` or returns `null`.
8. The API handler receives the `FlashcardDto` object from the service.
9. The API handler returns a `200 OK` response with the `FlashcardDto` as the JSON body.
10. In the `catch` block, if any error occurs:
    - If it is a `NotFoundError` (or similar), a `404 Not Found` response is returned.
    - If it is a validation error, a `400 Bad Request` response is returned.
    - For all other errors, it is logged with context (user ID, flashcard ID, error details), and a generic `500 Internal Server Error` response is returned to the client.

---

## 6. Security Considerations

### Authentication
- The endpoint is protected by Astro middleware that verifies the user's session. Only authenticated requests proceed to the handler.
- The `user_id` is always derived from `Astro.locals.session`, ensuring secure identification.

### Authorization
- Row-Level Security (RLS) policies on the `flashcards` table ensure that users can only access their own flashcards.
- Before returning the flashcard, the handler implicitly verifies ownership through the RLS policies enforced by Supabase.
- If a user attempts to access a flashcard they don't own (e.g., by guessing an ID), the database query returns no results, and the handler returns a `404 Not Found` response. This prevents information disclosure about the existence of other users' flashcards.

### Input Validation
- The `id` path parameter is validated to ensure it is a positive integer before querying the database.
- Validation happens before any database operations, preventing invalid data from reaching the database.

### Data Privacy
- The `FlashcardDto` type excludes sensitive fields:
  - `user_id`: Not exposed in API responses.
  - `fts_vector`: Internal full-text search vector not exposed to clients.
- Only necessary, user-facing fields are returned in the response.

### Protection Against Common Attacks
- **SQL Injection**: Supabase's parameterized queries prevent SQL injection.
- **ID Enumeration**: Although a user could theoretically try different IDs, RLS ensures they only access their own flashcards, and a 404 response is appropriate for IDs they don't own.
- **Session Hijacking**: Handled by the underlying session management in Astro middleware.

---

## 7. Error Handling

### Invalid ID Format (400 Bad Request)
**Scenario**: The `id` path parameter is not a valid positive integer.
- **Cause**: User provides malformed input (e.g., `GET /api/flashcards/abc`).
- **Handling**:
  1. Attempt to parse the `id` parameter as an integer.
  2. If parsing fails or the value is not positive, return a `400 Bad Request` response.
  3. Log the invalid input attempt at the `debug` level (not a security threat, just malformed input).

**Example Error Response**:
```json
{
  "error": "Invalid flashcard ID format"
}
```

### Flashcard Not Found (404 Not Found)
**Scenario**: No flashcard with the provided ID exists for the authenticated user.
- **Cause**: 
  - The ID is valid but does not correspond to any flashcard in the database.
  - The flashcard was deleted by the user or an admin.
  - The flashcard belongs to another user (RLS prevents it from being found).
- **Handling**:
  1. Query the database for the flashcard using the authenticated user's ID and the provided flashcard ID.
  2. If no row is returned, return a `404 Not Found` response.
  3. Do not log this as an error; it is an expected scenario (user may have deleted the flashcard).

**Example Error Response**:
```json
{
  "error": "Flashcard not found"
}
```

### Database Error (500 Internal Server Error)
**Scenario**: An unexpected database error occurs during the query.
- **Cause**: Connection failure, timeout, constraint violation, or other database-level issues.
- **Handling**:
  1. Catch the database error in the `catch` block.
  2. Log the error with full context:
     - User ID
     - Flashcard ID
     - Error message and stack trace
     - Timestamp
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
- **Handling**: Astro middleware intercepts the request and returns a `401` before the handler is invoked. No additional handling is needed in the endpoint handler.

---

## 8. Performance Considerations

### Primary Bottleneck
The main performance factor is the database query to retrieve the flashcard. However, this operation is highly optimized:
- **Indexed Lookup**: The `user_id` index on the `flashcards` table enables fast lookups by user and flashcard ID.
- **Simple Query**: A straightforward `SELECT` query with two equality conditions (user_id and id) is very efficient.
- **No Joins**: The endpoint does not require joins to other tables, minimizing overhead.

### Expected Performance
- **Typical request**: < 50 ms (depending on network latency and database load).
- **Worst case (database congestion)**: < 500 ms.

### Optimization Strategies
1. **Caching** (Optional):
   - If flashcard reads are very frequent, consider implementing client-side caching with appropriate cache headers (e.g., `Cache-Control: private, max-age=300`).
   - Server-side caching is not recommended for user-specific data due to privacy concerns and cache invalidation complexity.

2. **Index Optimization**:
   - Ensure the B-Tree index on `user_id` in the `flashcards` table exists and is properly maintained by the database.
   - The composite index on `(user_id, id)` would be optimal but may not be necessary given the already small result set.

3. **Query Optimization**:
   - The current query (SELECT by user_id and id) is already optimal.
   - No additional columns should be fetched; only the necessary fields for the DTO.

### Monitoring Recommendations
- Monitor the response time of the endpoint under typical load.
- Log database query times to identify potential bottlenecks.
- Alert if query operations exceed 500 ms (indicating database congestion or other issues).
- Track the frequency of 404 responses to identify potential issues with deleted flashcards or user confusion.

---

## 9. Implementation Steps

### Step 1: Create the Flashcard Service (if not already present)
Create a new file `src/lib/services/flashcardService.ts` with a method to retrieve a single flashcard by ID:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from 'src/db/database.types';
import type { FlashcardDto } from 'src/types';

export async function getById(
  supabase: SupabaseClient<Database>,
  userId: string,
  flashcardId: number
): Promise<FlashcardDto | null> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('id, front, back, source, generation_id, created_at, updated_at')
    .eq('user_id', userId)
    .eq('id', flashcardId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to retrieve flashcard: ${error.message}`);
  }

  return data as FlashcardDto | null;
}
```

**Key Details**:
- Uses `.maybeSingle()` to safely handle the case where no rows are returned (returns `null` instead of throwing an error).
- Explicitly selects only the fields needed for the DTO (excluding `user_id` and `fts_vector`).
- RLS policies ensure that only the authenticated user's flashcards are accessible.

### Step 2: Create the API Endpoint Handler
Create a new file `src/pages/api/flashcards/[id].ts` with the GET handler:

```typescript
import type { APIRoute } from 'astro';
import * as flashcardService from 'src/lib/services/flashcardService';
import type { FlashcardDto } from 'src/types';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Extract and validate the user ID from the session
    const userId = context.locals.userId;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate the flashcard ID from the path parameter
    const idParam = context.params.id;
    if (!idParam) {
      return new Response(JSON.stringify({ error: 'Invalid flashcard ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const flashcardId = parseInt(idParam, 10);
    if (isNaN(flashcardId) || flashcardId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid flashcard ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve the flashcard using the service
    const supabase = context.locals.supabase;
    const flashcard = await flashcardService.getById(supabase, userId, flashcardId);

    if (!flashcard) {
      return new Response(JSON.stringify({ error: 'Flashcard not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the flashcard as a successful response
    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log the error with context
    console.error('Error retrieving flashcard:', {
      userId: context.locals.userId,
      flashcardId: context.params.id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // Return a generic server error response
    return new Response(JSON.stringify({ error: 'An internal server error occurred. Please try again later.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

**Key Details**:
- Uses `context.locals.userId` set by middleware for authentication verification.
- Validates the `id` path parameter before attempting database operations.
- Calls `flashcardService.getById()` with proper error handling.
- Returns appropriate status codes and error messages for each scenario.
- Logs errors with sufficient context for debugging without exposing sensitive information to clients.
- Sets `prerender = false` to ensure dynamic rendering for authenticated requests.

### Step 3: Verify Middleware Configuration
Ensure that `src/middleware/index.ts` properly sets `context.locals.userId` and `context.locals.supabase`:

- The middleware should verify the user's session and extract the user ID from `Astro.locals.session`.
- The Supabase client should be initialized and made available in `context.locals.supabase`.
- The middleware should return a `401 Unauthorized` response if the session is invalid or missing.

No changes to the middleware are needed if it is already configured correctly.

### Step 4: Test the Endpoint

#### Test Case 1: Valid Request with Existing Flashcard
```bash
curl -X GET http://localhost:3000/api/flashcards/42 \
  -H "Cookie: session=<valid-session-token>"
```
**Expected Response**: `200 OK` with the flashcard DTO.

#### Test Case 2: Valid Request with Non-Existent Flashcard
```bash
curl -X GET http://localhost:3000/api/flashcards/99999 \
  -H "Cookie: session=<valid-session-token>"
```
**Expected Response**: `404 Not Found` with error message.

#### Test Case 3: Invalid ID Format
```bash
curl -X GET http://localhost:3000/api/flashcards/abc
```
**Expected Response**: `400 Bad Request` with error message.

#### Test Case 4: Missing Authentication
```bash
curl -X GET http://localhost:3000/api/flashcards/42
```
**Expected Response**: `401 Unauthorized` with error message.

### Step 5: Validate Code Quality
- Run linters (`eslint`) to ensure code quality.
- Ensure TypeScript compilation succeeds without errors.
- Verify that the implementation follows the project's coding guidelines (early returns, error handling, etc.).

---

## 10. Implementation Checklist

- [ ] Create `src/lib/services/flashcardService.ts` with the `getById()` function.
- [ ] Create `src/pages/api/flashcards/[id].ts` with the GET handler.
- [ ] Verify middleware configuration sets `context.locals.userId` and `context.locals.supabase`.
- [ ] Test the endpoint with valid, invalid, and edge-case requests.
- [ ] Run linters and TypeScript compiler to ensure code quality.
- [ ] Verify that error messages are user-friendly and do not expose sensitive information.
- [ ] Confirm that RLS policies are correctly configured to prevent unauthorized access.
- [ ] Document the endpoint in the project's API documentation (if applicable).
- [ ] Monitor the endpoint's performance after deployment.
