# API Endpoint Implementation Plan: GET /flashcards

## 1. Endpoint Overview

The `GET /flashcards` endpoint enables authenticated users to retrieve a paginated list of their flashcards with optional full-text search capabilities. This endpoint serves as the primary method for displaying flashcards in the user interface, supporting both browsing and searching across all flashcards created by the user (regardless of source: manual, AI-generated, or AI-edited).

**Purpose**: Provide a flexible, performant way for users to access their flashcard library with pagination and search functionality, enabling efficient UI rendering and search-driven discovery.

---

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/flashcards`
- **File Path**: `src/pages/api/flashcards/index.ts`

### Query Parameters

#### Required Parameters
None. All parameters are optional.

#### Optional Parameters
- **`page`** (integer, optional, default: 1): The page number for pagination. Must be a positive integer greater than 0.
- **`pageSize`** (integer, optional, default: 20): The number of flashcards to return per page. Must be a positive integer between 1 and 100 (maximum enforced to prevent excessive payload and database load).
- **`search`** (string, optional): A search term for full-text search across the `front` and `back` fields of flashcards. If provided, only flashcards matching the search term are returned. Maximum 200 characters to prevent injection attacks and excessive query complexity.

### Example Requests
```
GET /api/flashcards
GET /api/flashcards?page=2&pageSize=50
GET /api/flashcards?search=biology
GET /api/flashcards?page=1&pageSize=20&search=photosynthesis
```

---

## 3. Used Types

The implementation will use the following types defined in `src/types.ts`:

- **DTO Output**: `FlashcardDto` — The public-facing representation of a flashcard, excluding sensitive fields like `user_id` and `fts_vector`.
- **DTO Output**: `PaginationDto` — Metadata about the paginated response, including page number, page size, total items, and total pages.
- **DTO Output**: `PaginatedFlashcardsDto` — The complete response payload, containing an array of `FlashcardDto` objects and `PaginationDto` metadata.

No new types need to be created for this endpoint, as the required DTOs already exist.

---

## 4. Response Details

### Success Response (200 OK)

**Condition**: The request is valid, the user is authenticated, and the query executes successfully.

**Payload**: A `PaginatedFlashcardsDto` object containing the flashcard data and pagination metadata.

**Example Response**:
```json
{
  "data": [
    {
      "id": "1",
      "front": "What is REST?",
      "back": "Representational State Transfer is an architectural style for designing networked applications.",
      "source": "manual",
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-01T10:00:00Z"
    },
    {
      "id": "2",
      "front": "What is the purpose of a primary key?",
      "back": "A primary key uniquely identifies each record in a table and ensures data integrity.",
      "source": "ai-full",
      "created_at": "2025-11-02T14:30:00Z",
      "updated_at": "2025-11-02T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

### Error Responses

- **400 Bad Request**:
  - Query parameter validation fails (e.g., `page` is 0 or negative, `pageSize` exceeds 100, `search` exceeds 200 characters).
  - Invalid JSON or malformed query string.
  - **Response Example**:
    ```json
    {
      "error": "Validation failed",
      "details": [
        {
          "field": "pageSize",
          "message": "Page size must be between 1 and 100"
        }
      ]
    }
    ```

- **401 Unauthorized**:
  - The request lacks a valid authentication session.
  - **Response Example**:
    ```json
    {
      "error": "Unauthorized"
    }
    ```

- **500 Internal Server Error**:
  - A database error occurs during query execution (e.g., connection failure).
  - An unexpected server-side error occurs.
  - **Response Example**:
    ```json
    {
      "error": "An internal server error occurred. Please try again later."
    }
    ```

---

## 5. Data Flow

1. A `GET` request is made to `/api/flashcards` with optional query parameters (`page`, `pageSize`, `search`).
2. Astro middleware verifies the user's session. If invalid or missing, the request is rejected with a `401` status.
3. The `GET` handler in `src/pages/api/flashcards/index.ts` is executed.
4. The handler parses and validates query parameters using a Zod schema:
   - `page`: Parsed as an integer, default 1, must be >= 1.
   - `pageSize`: Parsed as an integer, default 20, must be between 1 and 100.
   - `search`: Trimmed string, optional, maximum 200 characters.
   - If validation fails, a `400 Bad Request` response is returned with detailed error information.
5. The handler retrieves the Supabase client and user ID from `Astro.locals`.
6. The handler calls the `flashcardService.getFlashcards()` method, passing:
   - The Supabase client
   - The authenticated user's ID
   - Pagination parameters (`page`, `pageSize`)
   - Optional search term
7. **Inside `flashcardService.getFlashcards()`**:
   - Calculate the offset: `(page - 1) * pageSize`
   - Build a Supabase query for the `flashcards` table:
     - Filter by `user_id` (Supabase RLS policy enforces this automatically)
     - If `search` is provided, filter using the `fts_vector` column with PostgreSQL's full-text search operators (e.g., `@@` or `.textSearch()`)
     - Select only columns included in `FlashcardDto` (excluding `user_id` and `fts_vector`)
     - Order by `created_at` descending (most recent first)
     - Apply pagination: `range(offset, offset + pageSize - 1)`
   - Execute the count query to determine the total number of matching flashcards:
     - Filter using the same conditions as the data query
     - Use `.count('exact')` to get the total count
   - Map the returned flashcard records to `FlashcardDto` objects (this is automatic if using `.select()` with correct column names)
   - Calculate total pages: `Math.ceil(totalItems / pageSize)`
   - Return an object matching `PaginatedFlashcardsDto` structure
8. The API handler receives the `PaginatedFlashcardsDto` object from the service.
9. The API handler returns a `200 OK` response with the paginated data as the JSON body.
10. In the `catch` block, if any error occurs, it is logged with context (user ID, query parameters, error details), and a generic `500 Internal Server Error` response is returned to the client.

---

## 6. Security Considerations

### Authentication
- The endpoint is protected by Astro middleware that verifies the user's session. Only authenticated requests are processed.
- The `user_id` is always derived from `Astro.locals.session`, ensuring that only the authenticated user's flashcards are returned.

### Authorization
- Supabase Row-Level Security (RLS) policies on the `flashcards` table automatically enforce that only flashcards belonging to the authenticated user are returned.
- The API handler does not need explicit authorization checks; the RLS policy provides an additional security layer.

### Input Validation
- A Zod schema enforces strict validation of query parameters:
  - `page`: Must be a positive integer (>= 1).
  - `pageSize`: Must be between 1 and 100 to prevent excessively large requests.
  - `search`: Optional string, maximum 200 characters, trimmed to remove leading/trailing whitespace.
- Invalid parameters trigger a `400 Bad Request` response before any database queries are executed.

### Data Privacy
- The response excludes sensitive fields:
  - `user_id`: Not included in `FlashcardDto`.
  - `fts_vector`: Not included in `FlashcardDto`, preventing exposure of internal search vector data.
- Only the authenticated user's flashcards are returned via RLS policy enforcement.

### Full-Text Search Security
- The `search` parameter is validated and limited to 200 characters to prevent injection attacks and excessive query complexity.
- Supabase's parameterized queries ensure that the search term cannot be used for SQL injection.
- The full-text search uses PostgreSQL's built-in `tsvector` functionality, which is safe and efficient.

### Rate Limiting
- Consider implementing rate limiting on the middleware to prevent abuse (e.g., 100 requests per user per minute).
- The `pageSize` limit of 100 items per request prevents excessive database load from individual requests.

---

## 7. Error Handling

### Validation Errors (400 Bad Request)
**Scenario**: Query parameters fail Zod validation.
- **Causes**:
  - `page` is 0, negative, or not an integer.
  - `pageSize` is 0, negative, exceeds 100, or not an integer.
  - `search` exceeds 200 characters.
  - Invalid query string format.
- **Handling**:
  1. Catch the Zod validation error.
  2. Extract field-level error details from the Zod error.
  3. Return a `400 Bad Request` response with error details.
  4. Log the error for debugging (with non-sensitive details like user ID and parameter names, not values).

**Example Error Response**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "pageSize",
      "message": "Page size must be between 1 and 100"
    },
    {
      "field": "search",
      "message": "Search term must not exceed 200 characters"
    }
  ]
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

### Database Errors (500 Internal Server Error)
**Scenario**: An unexpected database error occurs during query execution.
- **Causes**: Connection failure, permission issue, or other database-level problems.
- **Handling**:
  1. Catch the database error in the `catch` block.
  2. Log the error with context (user ID, query parameters, error stack trace) for debugging.
  3. Return a generic `500 Internal Server Error` response to the client (do not expose internal error details).

**Example Error Response**:
```json
{
  "error": "An internal server error occurred. Please try again later."
}
```

---

## 8. Performance Considerations

### Primary Bottlenecks
1. **Database Query Complexity**: Full-text search (FTS) using the `fts_vector` column can be slower than simple filtering if the search term matches many flashcards.
2. **Count Query**: Retrieving the total count of matching flashcards requires a separate query, which can be expensive for large datasets.

### Optimization Strategies

1. **Indexing**:
   - The `fts_vector` column has a GIN index, which efficiently supports full-text search queries.
   - The `user_id` column has a B-tree index, which optimizes filtering by user.
   - These indexes are already present in the database schema.

2. **Pagination**:
   - Enforcing a maximum `pageSize` of 100 items per request prevents excessively large result sets.
   - Using `offset` and `limit` on the database level ensures efficient data retrieval.

3. **Caching**:
   - For static or semi-static content (e.g., a user's flashcard library without active search), consider implementing client-side caching.
   - Server-side caching is less applicable here due to the real-time nature of the data, but could be considered for paginated results with TTL of a few seconds.

4. **Query Optimization**:
   - The `.select()` method specifies only required columns (excluding `user_id` and `fts_vector`), reducing payload size.
   - The query uses database-level filtering and pagination, minimizing data transferred over the network.

### Expected Performance
- **Typical request (no search, page 1, pageSize 20)**: < 100 ms (fast index lookup + pagination).
- **Search request (matching 500+ flashcards)**: 200–800 ms (FTS index lookup + count query).
- **Large pagination (pageSize 100)**: < 300 ms (efficient database retrieval).

### Monitoring Recommendations
- Monitor the response time of the endpoint under typical and peak load.
- Log database query times to identify slow FTS queries.
- Alert if response time exceeds 1 second (indicating database congestion or inefficient queries).
- Track the distribution of `pageSize` values to identify patterns in usage.

---

## 9. Implementation Steps

### Step 1: Create Validation Schema
In `src/pages/api/flashcards/index.ts`, create a Zod schema for query parameters:

```typescript
import { z } from 'zod';

const getFlashcardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Page size must not exceed 100')
    .default(20),
  search: z
    .string()
    .max(200, 'Search term must not exceed 200 characters')
    .trim()
    .optional(),
});

type GetFlashcardsQuery = z.infer<typeof getFlashcardsQuerySchema>;
```

### Step 2: Create Flashcard Service
Create a new file `src/lib/services/flashcardService.ts` with the following structure:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from 'src/db/database.types';
import type { PaginatedFlashcardsDto, FlashcardDto } from 'src/types';

export async function getFlashcards(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  pageSize: number,
  search?: string
): Promise<PaginatedFlashcardsDto> {
  // Implementation details in the following step
}
```

### Step 3: Implement Service Logic
Inside `flashcardService.ts`, implement the `getFlashcards` function:

```typescript
export async function getFlashcards(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  pageSize: number,
  search?: string
): Promise<PaginatedFlashcardsDto> {
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  // Build base query
  let query = supabase
    .from('flashcards')
    .select(
      'id, front, back, source, created_at, updated_at',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply search filter if search term is provided
  if (search && search.length > 0) {
    query = query.textSearch('fts_vector', search, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  // Execute query
  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch flashcards: ${error.message}`);
  }

  // Calculate pagination metadata
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Map data to FlashcardDto (automatically handled by Supabase select)
  return {
    data: (data ?? []) as FlashcardDto[],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}
```

### Step 4: Create API Handler
Create the API handler in `src/pages/api/flashcards/index.ts`:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getFlashcards } from 'src/lib/services/flashcardService';

export const prerender = false;

const getFlashcardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Page size must not exceed 100')
    .default(20),
  search: z
    .string()
    .max(200, 'Search term must not exceed 200 characters')
    .trim()
    .optional(),
});

type GetFlashcardsQuery = z.infer<typeof getFlashcardsQuerySchema>;

export const GET: APIRoute = async (context) => {
  try {
    // Verify authentication
    const session = context.locals.session;
    const supabase = context.locals.supabase;

    if (!session || !session.user || !supabase) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate query parameters
    const queryParams = getFlashcardsQuerySchema.safeParse(
      Object.fromEntries(context.url.searchParams)
    );

    if (!queryParams.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: queryParams.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { page, pageSize, search } = queryParams.data;
    const userId = session.user.id;

    // Fetch flashcards
    const result = await getFlashcards(
      supabase,
      userId,
      page,
      pageSize,
      search
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const userId = context.locals.session?.user?.id ?? 'unknown';
    const searchParams = Object.fromEntries(context.url.searchParams);

    console.error(
      `[GET /api/flashcards] Error for user ${userId}:`,
      {
        params: searchParams,
        error: error instanceof Error ? error.message : String(error),
      }
    );

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
};
```

### Step 5: Test the Endpoint
1. **Manual Testing**:
   - Use `curl` or Postman to test with various query parameters.
   - Verify pagination works correctly with different `page` and `pageSize` values.
   - Test the search functionality with various search terms.
   - Verify error responses for invalid parameters.

2. **Edge Cases**:
   - Test with `page` = 1, `pageSize` = 1 (minimum pagination).
   - Test with `page` exceeding total pages (should return empty data array, but correct pagination metadata).
   - Test with very long search terms (should be rejected by validation).
   - Test with special characters in search terms (should be handled safely by Supabase).

3. **Security Testing**:
   - Verify that the response excludes `user_id` and `fts_vector` fields.
   - Verify that a user cannot access other users' flashcards by manipulating the request.
   - Test with invalid session tokens to ensure `401` response.

### Step 6: Integration
1. Update the client-side component to use the `/api/flashcards` endpoint.
2. Implement client-side pagination and search UI.
3. Handle error responses and display user-friendly messages.

---
