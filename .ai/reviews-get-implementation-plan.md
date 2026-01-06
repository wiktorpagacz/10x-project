# API Endpoint Implementation Plan: GET /reviews

## 1. Endpoint Overview

The `GET /reviews` endpoint enables authenticated users to retrieve a list of flashcards due for review today according to a spaced repetition algorithm. This endpoint is invoked when users access their study/review session to continue practicing flashcards at optimal intervals for long-term retention. The endpoint queries the spaced repetition state, identifies flashcards whose next review date has arrived, and returns them in a minimal format suitable for active studying.

**Purpose**: Provide users with a personalized list of flashcards ready to be reviewed, following the principles of spaced repetition to optimize learning and retention.

---

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/reviews`
- **File Path**: `src/pages/api/reviews.ts`
- **Request Body**: None
- **Request Payload**: No JSON body required

### Parameters

#### Path Parameters
None.

#### Query Parameters
None (the endpoint returns all flashcards due for review today; filtering is done server-side).

#### Request Headers
- **Authentication**: Implicit through Astro middleware session verification. No explicit headers required in the request.

### Example Request
```
GET /api/reviews HTTP/1.1
Host: example.com
Cookie: session=<valid-session-token>
```

---

## 3. Used Types

The implementation will use the following types defined in `src/types.ts`:

- **DTO Type**: `ReviewFlashcardDto` — The minimal public-facing representation of a flashcard during review. This type is defined as `Pick<Flashcard, 'id' | 'front' | 'back'>`, containing only the fields necessary for studying.
- **Database Type**: `Flashcard` — The complete flashcard row type from the `flashcards` table, used internally for type safety.

**Note**: No new types are required beyond the existing `ReviewFlashcardDto` definition.

### Spaced Repetition State

**Important**: This plan assumes the existence of a spaced repetition state table (hereafter referred to as `spaced_repetition_state` or similar). This table should track:

| Column | Type | Purpose |
| --- | --- | --- |
| `user_id` | `UUID` | Foreign key to `auth.users.id` |
| `flashcard_id` | `BIGINT` | Foreign key to `flashcards.id` |
| `next_review_date` | `DATE` | The date when the flashcard is next due for review |
| `interval` | `INTEGER` | The number of days between reviews (part of SM-2 algorithm) |
| `ease_factor` | `FLOAT` | The ease factor for the flashcard (part of SM-2 algorithm) |
| `repetitions` | `INTEGER` | The number of times the flashcard has been reviewed |
| `last_reviewed_at` | `TIMESTAMPTZ` | Timestamp of the last review |

If this table does not exist, it must be created in a database migration before implementing this endpoint.

---

## 4. Response Details

### Success Response (200 OK)

**Condition**: The request is valid and authentication is successful. The response is returned regardless of whether any flashcards are due for review.

**Payload**: An array of `ReviewFlashcardDto` objects representing flashcards due for review today. The array may be empty if the user has no flashcards due for review.

**Example Response (with flashcards)**:
```json
[
  {
    "id": 1,
    "front": "What is REST?",
    "back": "Representational State Transfer is an architectural style for designing networked applications."
  },
  {
    "id": 2,
    "front": "What is an API?",
    "back": "Application Programming Interface is a set of protocols for building software applications."
  }
]
```

**Example Response (no flashcards due)**:
```json
[]
```

**Response Headers**:
- `Content-Type: application/json`
- `Cache-Control: private, no-cache` (recommended to prevent caching of user-specific data)

### Error Responses

- **401 Unauthorized**:
  - The request lacks a valid authentication session.
  - Handled by Astro middleware before the endpoint handler is invoked.
  - **Response Body**:
    ```json
    {
      "error": "Unauthorized"
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

1. A `GET` request is made to `/api/reviews`.
2. Astro middleware intercepts the request and verifies the user's session. If invalid or missing, the request is rejected with a `401` status before the handler is invoked.
3. The `GET` handler in `src/pages/api/reviews.ts` is executed.
4. The handler retrieves the Supabase client and user ID from `Astro.locals`.
5. The handler calls the `reviewService.getFlashcardsDueForReview()` method, passing:
   - The Supabase client
   - The authenticated user ID
   - Today's date (in the user's timezone, if available, or UTC)
6. **Inside `reviewService.getFlashcardsDueForReview()`**:
   - The service queries the spaced repetition state table to find all entries where:
     - `user_id` matches the authenticated user
     - `next_review_date` is less than or equal to today's date
   - The service performs a JOIN with the `flashcards` table to retrieve the `id`, `front`, and `back` fields.
   - Supabase Row-Level Security (RLS) policies ensure that only flashcards belonging to the authenticated user are accessible.
   - The service optionally shuffles the results to provide randomized presentation order (optional but recommended for unbiased review).
   - The service returns an array of `ReviewFlashcardDto` objects.
   - If a database error occurs, the service throws an error.
7. The API handler receives the array of `ReviewFlashcardDto` objects from the service.
8. The API handler returns a `200 OK` response with the array of flashcards as the JSON body.
9. In the `catch` block, if any error occurs:
   - The error is logged with context (user ID, error details)
   - A generic `500 Internal Server Error` response is returned to the client

---

## 6. Security Considerations

### Authentication
- The endpoint is protected by Astro middleware that verifies the user's session. Only authenticated requests proceed to the handler.
- The `user_id` is always derived from `Astro.locals.session`, ensuring secure identification.

### Authorization
- Row-Level Security (RLS) policies on the `flashcards` and spaced repetition state tables ensure that users can only access their own data.
- The service query implicitly filters by `user_id` at both the spaced repetition state and flashcard level.
- Users cannot retrieve flashcards they don't own due to RLS and the explicit user ID filter.

### Input Validation
- No user input is validated since there is no request body or query parameters.
- Implicit validation occurs through the authentication and authorization checks.

### Data Privacy
- The `ReviewFlashcardDto` type includes only essential fields: `id`, `front`, and `back`.
- Sensitive fields are excluded:
  - `user_id`: Not exposed in API responses.
  - Timestamps: Not exposed (not needed for reviewing).
  - `fts_vector`: Internal full-text search vector not exposed.
  - `source`: User's annotation method is not exposed (not relevant for studying).
  - `generation_id`: Internal metadata not exposed.

### Protection Against Common Attacks
- **SQL Injection**: Supabase's parameterized queries prevent SQL injection.
- **Enumeration Attacks**: Users can only see their own flashcards due to RLS and explicit user ID filtering.
- **Session Hijacking**: Handled by the underlying session management in Astro middleware.
- **Performance/DoS Attacks**: The endpoint executes a single, indexed database query. Rate limiting in middleware can be added if needed (e.g., 60 requests per minute per user).

---

## 7. Error Handling

### Unauthorized (401 Unauthorized)
**Scenario**: The request lacks a valid authentication session.
- **Cause**: No session cookie, expired token, or invalid token.
- **Handling**: Astro middleware intercepts the request and returns a `401` before the handler is invoked. No additional handling is needed in the endpoint handler.

**Example Error Response**:
```json
{
  "error": "Unauthorized"
}
```

### Database Error (500 Internal Server Error)
**Scenario**: An unexpected database error occurs during the query.
- **Cause**: 
  - Connection failure or timeout
  - Query execution error (e.g., malformed SQL, missing table)
  - Permission/RLS policy violation (unexpected)
- **Handling**:
  1. Catch the database error in the `catch` block.
  2. Log the error with full context:
     - User ID
     - Error message and stack trace
     - Timestamp
     - Query duration (if available)
  3. Return a generic `500 Internal Server Error` response to the client (do not expose internal error details).

**Example Error Response**:
```json
{
  "error": "An internal server error occurred. Please try again later."
}
```

### Success with Empty Results (200 OK)
**Scenario**: The user has no flashcards due for review today.
- **Cause**: All flashcards are either newly created, or their next review dates are in the future.
- **Handling**:
  1. The service returns an empty array.
  2. The handler returns a `200 OK` response with the empty array.
  3. No error is logged (this is an expected scenario).

**Example Response**:
```json
[]
```

---

## 8. Performance Considerations

### Primary Bottleneck
The main performance factor is the database query joining the spaced repetition state table with the `flashcards` table. However, this operation is highly optimized:

- **Indexed Lookups**: The query filters by `user_id` and `next_review_date`, both of which should be indexed with B-Tree indexes for fast lookups.
- **Simple Join**: The join between the spaced repetition state table and `flashcards` table uses primary and foreign keys, which are optimized for this operation.
- **Minimal Columns**: Only `id`, `front`, and `back` are selected, minimizing data transfer and computation.

### Expected Performance
- **Typical request (10-50 flashcards)**: < 100 ms (depending on network latency and database load).
- **Large request (100+ flashcards)**: < 500 ms.

### Optimization Strategies
1. **Indexing**:
   - Ensure a B-Tree index exists on `(user_id, next_review_date)` in the spaced repetition state table for optimal query performance.
   - Ensure a B-Tree index exists on `user_id` in the `flashcards` table (already specified in the database plan).

2. **Caching** (Optional):
   - Since the review list is user-specific and changes frequently, server-side caching is not recommended.
   - Client-side caching can be implemented with appropriate cache headers (e.g., `Cache-Control: private, max-age=60`), allowing the client to cache results for 1 minute.

3. **Pagination** (Future Enhancement):
   - If a user has many flashcards due for review (e.g., 1000+), consider implementing pagination to improve response time and reduce memory usage.
   - This is not required in the initial implementation but should be considered for scalability.

4. **Randomization**:
   - Shuffling results in the application layer (after database retrieval) is recommended for unbiased presentation.
   - This adds minimal overhead (O(n log n) complexity) and provides a better user experience.

### Monitoring Recommendations
- Monitor the response time of the endpoint under typical load.
- Log database query times to identify potential bottlenecks.
- Track the average number of flashcards per review session.
- Alert if query operations exceed 1 second (indicating database congestion or missing indexes).
- Monitor the cache hit rate if client-side caching is implemented.

---

## 9. Implementation Steps

### Step 1: Create the Review Service
Create a new file `src/lib/services/reviewService.ts` with a method to retrieve flashcards due for review:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from 'src/db/database.types';
import type { ReviewFlashcardDto } from 'src/types';

export async function getFlashcardsDueForReview(
  supabase: SupabaseClient<Database>,
  userId: string,
  reviewDate: Date = new Date()
): Promise<ReviewFlashcardDto[]> {
  // Format the review date as YYYY-MM-DD for comparison
  const reviewDateStr = reviewDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('spaced_repetition_state')
    .select(`
      flashcard_id,
      flashcards:flashcard_id (
        id,
        front,
        back
      )
    `)
    .eq('user_id', userId)
    .lte('next_review_date', reviewDateStr)
    .order('next_review_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to retrieve flashcards due for review: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Extract flashcard data from the joined response
  const flashcards = data
    .map((item: any) => item.flashcards)
    .filter((fc: any) => fc !== null) as ReviewFlashcardDto[];

  // Optionally shuffle the results for unbiased presentation
  return shuffleArray(flashcards);
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order.
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Key Details**:
- Queries the spaced repetition state table for entries where `next_review_date` is today or earlier.
- Joins with the `flashcards` table to retrieve the necessary fields.
- Filters by `user_id` to ensure users only see their own flashcards.
- Shuffles the results to provide randomized presentation order (optional but recommended).
- Handles database errors appropriately.

### Step 2: Create the API Endpoint Handler
Create a new file `src/pages/api/reviews.ts` with the GET handler:

```typescript
import type { APIRoute } from 'astro';
import * as reviewService from 'src/lib/services/reviewService';
import type { ReviewFlashcardDto } from 'src/types';

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

    // Retrieve the spaced repetition-based review list
    const supabase = context.locals.supabase;
    const flashcards = await reviewService.getFlashcardsDueForReview(supabase, userId);

    // Return the flashcards as a successful response
    return new Response(JSON.stringify(flashcards), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    // Log the error with context
    console.error('Error retrieving flashcards due for review:', {
      userId: context.locals.userId,
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
- Calls `reviewService.getFlashcardsDueForReview()` to retrieve the list of due flashcards.
- Returns appropriate status codes and error messages for each scenario.
- Logs errors with sufficient context for debugging without exposing sensitive information to clients.
- Sets `prerender = false` to ensure dynamic rendering for authenticated requests.

### Step 3: Create the Spaced Repetition State Table (if not already present)
Create a database migration file (e.g., `supabase/migrations/20250105000000_create_spaced_repetition_state.sql`):

```sql
-- Create the spaced_repetition_state table
CREATE TABLE spaced_repetition_state (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id BIGINT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interval INTEGER NOT NULL DEFAULT 1,
  ease_factor FLOAT NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to ensure one entry per user-flashcard pair
  UNIQUE(user_id, flashcard_id)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_spaced_repetition_state_user_id 
  ON spaced_repetition_state(user_id);

CREATE INDEX idx_spaced_repetition_state_user_review_date 
  ON spaced_repetition_state(user_id, next_review_date);

-- Enable Row-Level Security
ALTER TABLE spaced_repetition_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to ensure users can only access their own records
CREATE POLICY "Users can only view their own spaced repetition state"
  ON spaced_repetition_state
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy to ensure users can only update their own records
CREATE POLICY "Users can only update their own spaced repetition state"
  ON spaced_repetition_state
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policy to ensure users can only delete their own records
CREATE POLICY "Users can only delete their own spaced repetition state"
  ON spaced_repetition_state
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policy to ensure users can only insert their own records
CREATE POLICY "Users can only insert their own spaced repetition state"
  ON spaced_repetition_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Key Details**:
- Implements the SM-2 spaced repetition algorithm fields: `interval`, `ease_factor`, `repetitions`.
- Tracks the `last_reviewed_at` timestamp for audit purposes.
- Creates indexes on `user_id` and `(user_id, next_review_date)` for optimal query performance.
- Enables RLS to ensure users can only access their own spaced repetition state.

### Step 4: Initialize Spaced Repetition State for Existing Flashcards
Create a database trigger or scheduled task to initialize spaced repetition state entries for newly created flashcards:

```sql
-- Trigger to automatically create a spaced_repetition_state entry when a flashcard is created
CREATE OR REPLACE FUNCTION initialize_spaced_repetition_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO spaced_repetition_state (user_id, flashcard_id, next_review_date)
  VALUES (NEW.user_id, NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id, flashcard_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_initialize_spaced_repetition_state
AFTER INSERT ON flashcards
FOR EACH ROW
EXECUTE FUNCTION initialize_spaced_repetition_state();
```

**Key Details**:
- Automatically creates a spaced repetition state entry when a new flashcard is created.
- Sets the initial `next_review_date` to today, making the flashcard immediately available for review.
- Uses `ON CONFLICT DO NOTHING` to handle edge cases gracefully.

### Step 5: Verify Middleware Configuration
Ensure that `src/middleware/index.ts` properly sets `context.locals.userId` and `context.locals.supabase`:

- The middleware should verify the user's session and extract the user ID from `Astro.locals.session`.
- The Supabase client should be initialized and made available in `context.locals.supabase`.
- The middleware should return a `401 Unauthorized` response if the session is invalid or missing.

No changes to the middleware are needed if it is already configured correctly.

### Step 6: Test the Endpoint

#### Test Case 1: Valid Request with Flashcards Due
```bash
curl -X GET http://localhost:3000/api/reviews \
  -H "Cookie: session=<valid-session-token>"
```
**Expected Response**: `200 OK` with an array of `ReviewFlashcardDto` objects.

#### Test Case 2: Valid Request with No Flashcards Due
```bash
curl -X GET http://localhost:3000/api/reviews \
  -H "Cookie: session=<valid-session-token>"
```
**Expected Response**: `200 OK` with an empty array `[]`.

#### Test Case 3: Missing Authentication
```bash
curl -X GET http://localhost:3000/api/reviews
```
**Expected Response**: `401 Unauthorized` with error message.

#### Test Case 4: Verify Randomization (Optional)
```bash
# Make multiple requests and verify that the order of flashcards varies
for i in {1..5}; do
  curl -X GET http://localhost:3000/api/reviews \
    -H "Cookie: session=<valid-session-token>"
  echo ""
done
```
**Expected Behavior**: Flashcard order should vary between requests if shuffling is enabled.

### Step 7: Validate Code Quality
- Run linters (`eslint`) to ensure code quality.
- Ensure TypeScript compilation succeeds without errors.
- Verify that the implementation follows the project's coding guidelines (early returns, error handling, etc.).
- Verify that RLS policies are correctly configured on the spaced repetition state table.

---

## 10. Implementation Checklist

- [ ] Verify the existence of (or create) the `spaced_repetition_state` table with proper schema and indexes.
- [ ] Create the RLS policies for the `spaced_repetition_state` table.
- [ ] Create the database trigger to initialize spaced repetition state for new flashcards.
- [ ] Create `src/lib/services/reviewService.ts` with the `getFlashcardsDueForReview()` function.
- [ ] Create `src/pages/api/reviews.ts` with the GET handler.
- [ ] Verify middleware configuration sets `context.locals.userId` and `context.locals.supabase`.
- [ ] Test the endpoint with valid, invalid, and edge-case requests.
- [ ] Run linters and TypeScript compiler to ensure code quality.
- [ ] Verify that error messages are user-friendly and do not expose sensitive information.
- [ ] Confirm that RLS policies are correctly configured to prevent unauthorized access.
- [ ] Monitor the endpoint's performance after deployment.
- [ ] Document the endpoint in the project's API documentation (if applicable).
- [ ] Consider implementing pagination for users with large numbers of due flashcards (future enhancement).
- [ ] Consider implementing rate limiting for the endpoint (future enhancement).

---

## 11. Future Enhancements

1. **Pagination**: Implement pagination to support users with large numbers of due flashcards.
   - Example: `GET /api/reviews?page=1&pageSize=20`
   - Return pagination metadata with the response.

2. **Sorting Options**: Allow users to sort by different criteria (e.g., `next_review_date`, `ease_factor`).
   - Example: `GET /api/reviews?sortBy=next_review_date&order=asc`

3. **Filtering**: Allow filtering by flashcard source or generation session.
   - Example: `GET /api/reviews?source=ai-full`

4. **Rate Limiting**: Implement rate limiting to prevent abuse.
   - Example: 60 requests per minute per user.

5. **Timezone Support**: Track user timezone and calculate "today" based on their local time rather than UTC.

6. **Review Statistics**: Return metadata about the review session (e.g., average ease factor, total repetitions).

7. **Pre-loading**: Consider pre-loading flashcard data into cache for faster retrieval on subsequent requests.
