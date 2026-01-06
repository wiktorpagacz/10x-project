## 1. Endpoint Overview
This document details the implementation plan for the `POST /generations` endpoint. The endpoint's primary function is to accept a block of source text from an authenticated user, use an AI service to generate flashcard suggestions, log the generation session in the database, and return the suggestions to the client for review.

## 2. Request Details
-   **HTTP Method**: `POST`
-   **URL Structure**: `/api/generations`
-   **File Path**: `src/pages/api/generations/index.ts`
-   **Request Body**: The request body must be a JSON object conforming to the `CreateGenerationCommand` type.
    ```json
    {
      "source_text": "A string of text between 1000 and 10000 characters."
    }
    ```

## 3. Used Types
The implementation will use the following types defined in `src/types.ts`:
-   **Command Model**: `CreateGenerationCommand` for validating the request body.
-   **Response DTO**: `CreateGenerationResponseDto` for structuring the successful response payload.
-   **Component DTO**: `SuggestedFlashcardDto` for items in the `suggested_flashcards` array.

## 4. Response Details
-   **Success (200 OK)**:
    -   **Condition**: The request is valid, and the AI successfully generates flashcards.
    -   **Payload**: A `CreateGenerationResponseDto` object.
        ```json
        {
          "generation_id": 123,
          "suggested_flashcards": [
            { "front": "Suggested question 1", "back": "Suggested answer 1", "source": "ai-full" },
            { "front": "Suggested question 2", "back": "Suggested answer 2", "source": "ai-full" }
          ],
          "generated_count": 2
        }
        ```
-   **Error Responses**:
    -   `400 Bad Request`: The request body is invalid or `source_text` does not meet length requirements.
    -   `401 Unauthorized`: The user is not authenticated.
    -   `500 Internal Server Error`: The AI service fails or another server-side error occurs.

## 5. Data Flow
1.  A `POST` request with a JSON body is made to `/api/generations`.
2.  Astro middleware verifies the user's session. If invalid, the request is rejected with a `401` status.
3.  The `POST` handler in `src/pages/api/generations/index.ts` is executed.
4.  The handler uses a Zod schema based on `CreateGenerationCommand` to validate the request body. If validation fails, it returns a `400` response.
5.  The handler retrieves the user's ID from `Astro.locals.session`.
6.  It calls the `generation.service`, passing the Supabase client, user ID, and the validated `source_text`.
7.  **Inside `generation.service`**:
    a.  The service calculates the `source_text_length` and the SHA-256 hash of the `source_text`.
    b.  It records the start time for measuring `generation_duration`.
    c.  It calls the AI service (via OpenRouter) with the `source_text` embedded in a carefully crafted prompt.
    d.  **If the AI call fails**:
        i.  The error is caught.
        ii. A new record is inserted into the `generation_error_logs` table containing the `user_id`, `model`, text hash, length, and detailed error information.
        iii. The service throws an exception, which is caught by the API handler, resulting in a `500` response.
    e.  **If the AI call succeeds**:
        i.  The service parses the AI's response to extract the flashcard pairs.
        ii. It inserts a new record into the `generations` table with the `user_id`, `model`, text hash, length, and the calculated `generation_duration`. The `generated_count` is set to the number of flashcards returned by the AI.
        iii. The service retrieves the `id` of the newly created generation record.
        iv. It formats the data into a `CreateGenerationResponseDto` object and returns it.
8.  The API handler receives the DTO from the service and sends it as a JSON response with a `200 OK` status code.

## 6. Security Considerations
-   **Authentication**: The endpoint will be protected by Astro middleware to ensure all requests originate from an authenticated user.
-   **Authorization**: Supabase Row-Level Security (RLS) policies on `generations` and `generation_error_logs` tables will prevent any cross-user data access at the database level.
-   **Rate Limiting**: To prevent API abuse and control costs associated with the OpenRouter service, rate limiting must be implemented. A limit of 5 generation requests per user per minute is recommended. This should be added to the Astro middleware.
-   **Input Validation**: Strict validation of `source_text` length via Zod is mandatory to align with database constraints and prevent oversized payloads.

## 7. Performance Considerations
-   **Primary Bottleneck**: The main performance factor is the response time of the external OpenRouter AI API. This can vary from a few seconds to longer, depending on the model and server load. The endpoint is effectively synchronous for the client during this wait.
-   **Database Operations**: The database inserts are lightweight and will be very fast due to proper indexing on `user_id`. They do not represent a significant performance concern.

## 8. Implementation Steps
1.  **Define Validation Schema**: In `src/pages/api/generations/index.ts`, create a Zod schema for the `CreateGenerationCommand`.
    ```typescript
    import { z } from 'zod';

    const createGenerationSchema = z.object({
      source_text: z.string().min(1000).max(10000),
    });
    ```
2.  **Create Hashing Utility**: In `src/lib/`, create a utility file (e.g., `crypto.ts`) with a function to compute the SHA-256 hash of a string.
3.  **Create AI Service Wrapper**: In `src/lib/services/`, create a file (e.g., `aiService.ts` or `openRouterService.ts`) to encapsulate the logic for calling the OpenRouter.ai API. This will handle constructing the request, adding the API key from environment variables, and making the `fetch` call.
4.  **Create `generationService.ts`**: Create the file `src/lib/services/generationService.ts`.
5.  **Implement Core Service Logic**: Inside `generationService.ts`, create the main async function that:
    -   Accepts `supabase`, `userId`, and `source_text`.
    -   Orchestrates the data flow described in section 5.
    -   Includes a private helper function `logErrorToDb` to handle inserts into `generation_error_logs`.
6.  **Implement API Route Handler**: In `src/pages/api/generations/index.ts`, implement the `POST` handler function.
    -   Ensure `export const prerender = false;` is set.
    -   Retrieve `supabase` and `session` from `context.locals`. Return `401` if no session.
    -   Wrap the logic in a `try...catch` block.
    -   Parse the request body using the Zod schema. Return `400` on failure.
    -   Call the `generationService`.
    -   On success, return a `200` response with the DTO from the service.
    -   In the `catch` block, log the error and return a generic `500` error response.
7.  **Update Middleware with Rate Limiting**: Modify `src/middleware/index.ts` to include rate-limiting logic for the `POST /api/generations` route. An in-memory store or a service like Upstash can be used.