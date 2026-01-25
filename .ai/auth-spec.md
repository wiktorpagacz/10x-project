# Authentication System Architecture Specification

## Document Overview

This document provides a detailed technical specification for implementing user authentication functionality in the 10xCards application. The specification covers user registration (US-001) and login (US-002) requirements from the PRD, ensuring compatibility with the existing application architecture.

### PRD Alignment Notes

This specification aligns with the following PRD requirements:
- **US-001**: User registration with email/password
- **US-002**: User login with session persistence
- **US-007**: Default view after login is generation view (not flashcard list)
- **US-008**: Empty state behavior for new users

**Out of MVP Scope** (per PRD Section 4.2):
- Password recovery for forgotten passwords (infrastructure prepared but not implemented)
- OAuth/social login providers

**Clarifications:**
- Default post-login redirect is `/` (generation view), per US-007
- Session persistence (US-002 criterion 4) is handled by Supabase's default cookie behavior
- Error messages should support Polish language (per PRD examples)

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1. New Pages

#### 1.1.1. Login Page (`/src/pages/login.astro`)

**Purpose:** Entry point for existing users to authenticate.

**Route:** `/login`

**Requirements:**
- Accessible only to unauthenticated users (redirect to `/` if already logged in)
- Contains the `LoginForm` React component
- Displays link to registration page
- Uses `AuthLayout` for consistent auth page styling

**Astro Page Responsibilities:**
- Server-side session check via middleware
- Redirect authenticated users to home page (generation view)
- Render the React form component with `client:load` directive

#### 1.1.2. Registration Page (`/src/pages/register.astro`)

**Purpose:** Allow new users to create an account.

**Route:** `/register`

**Requirements:**
- Accessible only to unauthenticated users
- Contains the `RegisterForm` React component
- Displays link to login page
- Uses `AuthLayout`

**Astro Page Responsibilities:**
- Server-side session check
- Redirect authenticated users to home page
- Render the React form component

#### 1.1.3. Password Recovery Page (`/src/pages/recover-password.astro`)

**Purpose:** Initiate password reset process.

**Route:** `/recover-password`

**Status:** OUT OF MVP SCOPE - This page is documented for architectural completeness only. Password recovery for forgotten passwords is not part of MVP (PRD Section 4.2 defines MVP boundaries). US-003 covers password *change* for logged-in users, which is a separate feature.

**Future Implementation Notes:**
- Will use Supabase `resetPasswordForEmail()` method
- Requires email configuration in Supabase dashboard
- Architecture supports adding this feature post-MVP

### 1.2. New Layouts

#### 1.2.1. Auth Layout (`/src/layouts/AuthLayout.astro`)

**Purpose:** Dedicated layout for authentication pages with centered card design.

**Structure:**
```
AuthLayout
├── Base HTML (head, meta, styles)
├── Centered container
│   ├── Logo/Brand header
│   ├── <slot /> (form content)
│   └── Footer links
└── Toast notifications container
```

**Props Interface:**
```typescript
interface AuthLayoutProps {
  title: string;
  description?: string;
}
```

#### 1.2.2. Updated Main Layout (`/src/layouts/Layout.astro`)

**Modifications needed:**
- Add navigation header with user info display
- Add logout button when authenticated
- Add conditional navigation elements based on auth state
- Pass `session` data to client components when needed

**New Structure:**
```
Layout
├── Base HTML
├── Navigation Header (new)
│   ├── Logo/Brand
│   ├── Nav links (conditional on auth)
│   │   ├── "Generate" (home)
│   │   └── "My Flashcards" (when user has flashcards)
│   └── User Menu (when authenticated)
│       ├── User email display
│       └── Logout button
├── Main content
│   └── <slot />
└── Toast notifications
```

### 1.3. New React Components

#### 1.3.1. LoginForm Component (`/src/components/auth/LoginForm.tsx`)

**Purpose:** Interactive login form with client-side validation and API communication.

**State Management:**
```typescript
interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}
```

**Features:**
- Email input with format validation
- Password input with visibility toggle
- Submit button with loading state
- Error display (field-level and general)
- Link to registration page

**Note:** "Remember me" checkbox is not included in MVP. Session persistence (US-002 criterion 4) is satisfied by Supabase's default cookie behavior which maintains session across browser restarts.

**Validation Rules (Client-side):**
| Field    | Rule                          | Error Message (EN)                  | Error Message (PL)                      |
|----------|-------------------------------|-------------------------------------|-----------------------------------------|
| email    | Required                      | "Email is required"                 | "Email jest wymagany"                   |
| email    | Valid email format            | "Please enter a valid email"        | "Wprowadź poprawny adres email"         |
| password | Required                      | "Password is required"              | "Hasło jest wymagane"                   |

**API Integration:**
- Calls `POST /api/auth/login` on submit
- Handles success: redirect to `/` (generation view, per US-007)
- Handles errors: display "Nieprawidłowy login lub hasło" (per US-002 criterion 3)

#### 1.3.2. RegisterForm Component (`/src/components/auth/RegisterForm.tsx`)

**Purpose:** Interactive registration form with validation and account creation.

**State Management:**
```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
}
```

**Features:**
- Email input with format validation
- Password input
- Password confirmation input
- Submit button with loading state
- Error display (field-level and general)
- Link to login page

**Note:** Password strength indicator and terms acceptance checkbox are not required by PRD and are omitted from MVP.

**Validation Rules (Client-side):**
Per US-001 criteria 2: validate email uniqueness and password match.

| Field           | Rule                          | Error Message (EN)                         | Error Message (PL)                          |
|-----------------|-------------------------------|--------------------------------------------|---------------------------------------------|
| email           | Required                      | "Email is required"                        | "Email jest wymagany"                       |
| email           | Valid email format            | "Please enter a valid email"               | "Wprowadź poprawny adres email"             |
| password        | Required                      | "Password is required"                     | "Hasło jest wymagane"                       |
| password        | Min 8 characters              | "Password must be at least 8 characters"   | "Hasło musi mieć co najmniej 8 znaków"      |
| confirmPassword | Required                      | "Please confirm your password"             | "Potwierdź swoje hasło"                     |
| confirmPassword | Matches password              | "Passwords do not match"                   | "Hasła nie są zgodne"                       |

**Note on password complexity:** PRD does not specify password complexity requirements beyond basic security. The 8-character minimum is a reasonable default. Additional complexity rules (uppercase, numbers) are NOT required by PRD and should be omitted from MVP to reduce user friction.

**API Integration:**
- Calls `POST /api/auth/register` on submit
- Handles success: auto-login and redirect to `/` (generation view, per US-001 criterion 3)
- Handles errors: display "Email jest już zajęty" for duplicate email (per US-001 criterion 4)

#### 1.3.3. UserMenu Component (`/src/components/auth/UserMenu.tsx`)

**Purpose:** Dropdown menu displaying user info and logout option.

**Props:**
```typescript
interface UserMenuProps {
  email: string;
  onLogout: () => void;
}
```

**Features:**
- Display user email (truncated if long)
- Dropdown with logout button
- Optional: link to settings/profile

#### 1.3.4. LogoutButton Component (`/src/components/auth/LogoutButton.tsx`)

**Purpose:** Standalone logout trigger for flexible placement.

**Behavior:**
- Calls `POST /api/auth/logout`
- Clears client-side state
- Redirects to `/login`

### 1.4. Component Organization

**New Directory Structure:**
```
src/components/auth/
├── index.ts              # Barrel exports
├── LoginForm.tsx
├── RegisterForm.tsx
├── UserMenu.tsx
├── LogoutButton.tsx
├── PasswordInput.tsx     # Reusable password field with toggle
├── AuthFormWrapper.tsx   # Common form container with error handling
└── hooks/
    ├── useLoginForm.ts
    ├── useRegisterForm.ts
    └── useAuth.ts        # Auth state and actions hook
```

### 1.5. Updated Existing Components

#### 1.5.1. GenerationView Component

**Current State:** Assumes authentication handled elsewhere.

**Required Changes:**
- Add authentication state check
- Display appropriate message if session expires during use
- Handle 401 responses from API calls gracefully

### 1.6. Validation Error Messages Summary

**Login Errors (per US-002 criterion 3):**
| Scenario                    | Error Code            | User Message (PL - per PRD)                       |
|-----------------------------|-----------------------|---------------------------------------------------|
| Invalid credentials         | `INVALID_CREDENTIALS` | "Nieprawidłowy login lub hasło"                   |
| Account not found           | `INVALID_CREDENTIALS` | "Nieprawidłowy login lub hasło" (same for security) |
| Server error                | `SERVER_ERROR`        | "Wystąpił błąd. Spróbuj ponownie"                 |

**Registration Errors (per US-001 criterion 4):**
| Scenario                    | Error Code        | User Message (PL - per PRD)                       |
|-----------------------------|-------------------|---------------------------------------------------|
| Email already exists        | `EMAIL_EXISTS`    | "Ten adres email jest już zajęty"                 |
| Invalid email format        | `INVALID_EMAIL`   | "Wprowadź poprawny adres email"                   |
| Passwords don't match       | `PASSWORD_MISMATCH` | "Hasła nie są zgodne"                           |
| Password too short          | `WEAK_PASSWORD`   | "Hasło musi mieć co najmniej 8 znaków"            |
| Server error                | `SERVER_ERROR`    | "Wystąpił błąd. Spróbuj ponownie"                 |

### 1.7. User Flow Scenarios

**Note:** These scenarios directly map to PRD acceptance criteria.

#### Scenario 1: New User Registration (Success) - US-001
1. User navigates to `/register`
2. Fills in email, password, password confirmation (US-001 criterion 1)
3. Client validates: email format, passwords match (US-001 criterion 2)
4. Form submits to `POST /api/auth/register`
5. Server validates email not already in use (US-001 criterion 2)
6. Server creates account in Supabase Auth
7. Server creates session - user is automatically logged in (US-001 criterion 3)
8. Client redirects to `/` (generation view - main app panel per US-001 criterion 3)

#### Scenario 2: Login (Success) - US-002
1. User navigates to `/login`
2. Fills in email and password (US-002 criterion 1)
3. Client validates inputs
4. Form submits to `POST /api/auth/login`
5. Server authenticates with Supabase
6. Session cookie is set (persists across browser restarts per US-002 criterion 4)
7. Client redirects to `/` (generation view per US-007)

#### Scenario 3: Login (Failure - Wrong Password) - US-002
1. User submits login form
2. Server returns 401 with `INVALID_CREDENTIALS`
3. Client displays "Nieprawidłowy login lub hasło" (US-002 criterion 3)
4. Form fields remain populated (except password cleared for security)
5. User can retry

#### Scenario 4: Registration (Failure - Email Taken) - US-001
1. User submits registration form with existing email
2. Server returns 409 with `EMAIL_EXISTS`
3. Client displays "Ten adres email jest już zajęty" (US-001 criterion 4)
4. User can correct and retry

#### Scenario 5: Session Persistence - US-002
1. User logs in successfully
2. User closes browser
3. User reopens browser and navigates to app
4. Session cookie is still valid (US-002 criterion 4)
5. User is still authenticated, sees generation view

#### Scenario 6: Authenticated User Accesses Login Page
1. Authenticated user navigates to `/login`
2. Server-side middleware detects valid session
3. User is redirected to `/` (generation view)

---

## 2. BACKEND LOGIC

### 2.1. API Endpoints

#### 2.1.1. POST `/api/auth/register`

**File:** `/src/pages/api/auth/register.ts`

**Purpose:** Create a new user account (US-001).

**Request Body:**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
}
```

**Request Validation Schema (Zod):**
```typescript
// Simplified validation per PRD - no complexity requirements specified
const registerSchema = z.object({
  email: z.string()
    .email('Wprowadź poprawny adres email')
    .max(254, 'Adres email jest za długi'),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków')
    .max(72, 'Hasło jest za długie'),  // bcrypt limit
});
```

**Success Response (201):**
```typescript
interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
  message: string;
}
```

**Error Responses:**
| Status | Code              | Condition                       |
|--------|-------------------|---------------------------------|
| 400    | `VALIDATION_ERROR`| Invalid input data              |
| 409    | `EMAIL_EXISTS`    | Email already registered        |
| 500    | `SERVER_ERROR`    | Supabase or server error        |

**Logic Flow:**
1. Parse and validate request body
2. Call `supabase.auth.signUp()` with email/password
3. Handle Supabase response
4. If success, session is automatically created
5. Return user info and success message

#### 2.1.2. POST `/api/auth/login`

**File:** `/src/pages/api/auth/login.ts`

**Purpose:** Authenticate existing user.

**Request Body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Request Validation Schema (Zod):**
```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
```

**Success Response (200):**
```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  message: string;
}
```

**Error Responses:**
| Status | Code                 | Condition                       |
|--------|----------------------|---------------------------------|
| 400    | `VALIDATION_ERROR`   | Invalid input data              |
| 401    | `INVALID_CREDENTIALS`| Wrong email or password         |
| 500    | `SERVER_ERROR`       | Supabase or server error        |

**Logic Flow:**
1. Parse and validate request body
2. Call `supabase.auth.signInWithPassword()`
3. Handle Supabase response
4. Session cookie handled by Supabase client
5. Return user info

#### 2.1.3. POST `/api/auth/logout`

**File:** `/src/pages/api/auth/logout.ts`

**Purpose:** End user session.

**Request:** Empty body (session from cookies)

**Success Response (200):**
```typescript
interface LogoutResponse {
  message: string;
}
```

**Error Responses:**
| Status | Code          | Condition                |
|--------|---------------|--------------------------|
| 500    | `SERVER_ERROR`| Failed to clear session  |

**Logic Flow:**
1. Get session from context.locals
2. Call `supabase.auth.signOut()`
3. Clear any server-side session data
4. Return success

#### 2.1.4. GET `/api/auth/session`

**File:** `/src/pages/api/auth/session.ts`

**Purpose:** Check current authentication status (for client-side state sync).

**Success Response (200):**
```typescript
interface SessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
}
```

**Logic Flow:**
1. Get session from context.locals
2. Return authentication status and user info

### 2.2. Data Models

#### 2.2.1. Auth-Related Types (`/src/types.ts` additions)

```typescript
// ################################################################# //
// ###################### AUTH DTO TYPES ########################### //
// ################################################################# //

/**
 * Request payload for user registration.
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
}

/**
 * Request payload for user login.
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Response payload for successful authentication.
 */
export interface AuthResponseDto {
  user: {
    id: string;
    email: string;
  };
  message: string;
}

/**
 * Response payload for session status check.
 */
export interface SessionResponseDto {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
}

/**
 * Standard error response structure for auth endpoints.
 */
export interface AuthErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

### 2.3. Service Layer

#### 2.3.1. Auth Service (`/src/lib/services/auth.service.ts`)

**Purpose:** Encapsulate all Supabase Auth interactions.

**Interface:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

export interface AuthService {
  /**
   * Register a new user with email and password.
   * @throws AuthError on failure
   */
  register(
    supabase: SupabaseClient<Database>,
    email: string,
    password: string
  ): Promise<{ user: { id: string; email: string } }>;

  /**
   * Authenticate user with email and password.
   * @throws AuthError on failure
   */
  login(
    supabase: SupabaseClient<Database>,
    email: string,
    password: string
  ): Promise<{ user: { id: string; email: string } }>;

  /**
   * End the current session.
   */
  logout(supabase: SupabaseClient<Database>): Promise<void>;

  /**
   * Get current session status.
   */
  getSession(
    supabase: SupabaseClient<Database>
  ): Promise<{ user: { id: string; email: string } } | null>;
}
```

#### 2.3.2. Auth Error Types (`/src/lib/services/auth.error.ts`)

```typescript
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

export class EmailExistsError extends AuthError {
  constructor() {
    super('EMAIL_EXISTS', 'Ten adres email jest już zajęty', 409);
  }
}

export class WeakPasswordError extends AuthError {
  constructor() {
    super('WEAK_PASSWORD', 'Hasło musi mieć co najmniej 8 znaków', 400);
  }
}

export class PasswordMismatchError extends AuthError {
  constructor() {
    super('PASSWORD_MISMATCH', 'Hasła nie są zgodne', 400);
  }
}
```

### 2.4. Input Validation

#### 2.4.1. Validation Schemas (`/src/lib/validators/auth.validators.ts`)

```typescript
import { z } from 'zod';

/**
 * Email validation schema - reusable across forms.
 * Messages in Polish per PRD requirements.
 */
export const emailSchema = z
  .string()
  .min(1, 'Email jest wymagany')
  .email('Wprowadź poprawny adres email')
  .max(254, 'Adres email jest za długi');

/**
 * Password validation for registration.
 * Per PRD: only 8 character minimum required, no complexity rules.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .max(72, 'Hasło jest za długie');

/**
 * Password validation for login - minimal (actual validation happens server-side).
 */
export const loginPasswordSchema = z
  .string()
  .min(1, 'Hasło jest wymagane');

/**
 * Complete registration form schema.
 * Validates password confirmation match per US-001 criterion 2.
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Potwierdź swoje hasło'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Hasła nie są zgodne',
  path: ['confirmPassword'],
});

/**
 * Complete login form schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
```

### 2.5. Exception Handling Strategy

**Centralized Error Handler Pattern:**

```typescript
// In each API endpoint
export async function POST(context: APIContext): Promise<Response> {
  try {
    // ... endpoint logic
  } catch (error) {
    return handleAuthError(error);
  }
}

function handleAuthError(error: unknown): Response {
  // Known auth errors
  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
        },
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Supabase errors
  if (isSupabaseError(error)) {
    return mapSupabaseError(error);
  }

  // Unknown errors - log and return generic message
  console.error('Unexpected auth error:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

### 2.6. Middleware Updates

#### 2.6.1. Updated Middleware (`/src/middleware/index.ts`)

**Required Changes:**

1. **Enhanced Session Handling:**
   - Use `supabase.auth.getUser()` for server-side validation (more secure than `getSession()`)
   - Refresh expired sessions automatically

2. **Route Protection:**
   - Define protected and public route patterns
   - Redirect unauthenticated users to login
   - Redirect authenticated users away from auth pages

3. **Session Refresh:**
   - Handle token refresh on each request if needed

**Updated Structure:**
```typescript
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@supabase/ssr';

// Route configuration
const PUBLIC_ROUTES = ['/login', '/register', '/recover-password'];
const AUTH_ROUTES = ['/login', '/register'];  // Redirect away if authenticated
const API_PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/register'];

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Create Supabase client with cookie handling
  const supabase = createServerClient(/* ... */);
  
  // 2. Get and validate session
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // 3. Store in locals
  context.locals.supabase = supabase;
  context.locals.user = user;
  
  // 4. Route protection logic
  const path = new URL(context.request.url).pathname;
  
  // Protect non-public routes
  if (!isPublicRoute(path) && !user) {
    return context.redirect(`/login?returnUrl=${encodeURIComponent(path)}`);
  }
  
  // Redirect authenticated users from auth pages
  if (isAuthRoute(path) && user) {
    return context.redirect('/');
  }
  
  // 5. Continue with existing rate limiting logic...
  
  return next();
});
```

### 2.7. Server-Side Rendering Updates

**Affected Pages:**

1. **`/src/pages/index.astro`:**
   - Access `Astro.locals.user` for user data
   - Pass user info to Layout for header rendering

2. **New Auth Pages:**
   - Check session in frontmatter
   - Redirect if necessary before render

**Example Pattern:**
```astro
---
// In a protected page
const user = Astro.locals.user;

if (!user) {
  return Astro.redirect('/login');
}
---
```

---

## 3. AUTHENTICATION SYSTEM

### 3.1. Supabase Auth Integration

#### 3.1.1. Client Configuration

**Server-Side Client (`/src/db/supabase.server.ts` - NEW):**

For SSR with cookie-based auth, use `@supabase/ssr` package:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from './database.types';

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value;
        },
        set(key: string, value: string, options: CookieOptions) {
          cookies.set(key, value, options);
        },
        remove(key: string, options: CookieOptions) {
          cookies.delete(key, options);
        },
      },
    }
  );
}
```

**Update Existing Client (`/src/db/supabase.client.ts`):**

The existing client can remain for client-side operations, but auth operations should use the server client in API routes and middleware.

#### 3.1.2. Authentication Flow

**Registration Flow:**
```
Client                    Server                     Supabase
  |                         |                           |
  |-- POST /api/auth/register -->                       |
  |                         |-- signUp(email, pass) --->|
  |                         |<-- User + Session --------|
  |                         |-- Set session cookie      |
  |<-- 201 + User info -----|                           |
  |                         |                           |
  |-- Redirect to / ------->|                           |
```

**Login Flow:**
```
Client                    Server                     Supabase
  |                         |                           |
  |-- POST /api/auth/login --->                         |
  |                         |-- signInWithPassword ---->|
  |                         |<-- User + Session --------|
  |                         |-- Set session cookie      |
  |<-- 200 + User info -----|                           |
  |                         |                           |
  |-- Redirect to / ------->|                           |
```

**Logout Flow:**
```
Client                    Server                     Supabase
  |                         |                           |
  |-- POST /api/auth/logout -->                         |
  |                         |-- signOut() ------------->|
  |                         |<-- Success ---------------|
  |                         |-- Clear session cookie    |
  |<-- 200 ----------------|                            |
  |                         |                           |
  |-- Redirect to /login -->|                           |
```

#### 3.1.3. Session Management

**Cookie Configuration:**
- Name: `sb-<project-ref>-auth-token` (Supabase default)
- HttpOnly: Yes (for security)
- Secure: Yes (in production)
- SameSite: Lax
- Path: /
- Max-Age: Based on Supabase session settings

**Session Refresh Strategy:**
- Supabase handles automatic token refresh
- Middleware validates session on each request
- Expired sessions trigger redirect to login

#### 3.1.4. Security Considerations

1. **Password Security:**
   - Supabase handles hashing (bcrypt)
   - Minimum 8 characters enforced
   - Complexity requirements in client validation

2. **Session Security:**
   - HttpOnly cookies prevent XSS token theft
   - CSRF protection via SameSite cookie attribute
   - Server-side session validation

3. **Rate Limiting:**
   - Extend existing rate limiting to auth endpoints
   - Suggested limits:
     - Login: 5 attempts per minute per IP
     - Registration: 3 attempts per minute per IP

4. **Error Message Security:**
   - Don't reveal if email exists on login failure
   - Use generic "Invalid credentials" message

### 3.2. Environment Variables

**Required additions to `.env`:**
```
# Already existing
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# May need for server operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Only if needed for admin operations
```

**Update `env.d.ts`:**
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;  // Optional
  readonly OPENROUTER_API_KEY: string;
}
```

### 3.3. Type Updates for Locals

**Update `env.d.ts`:**
```typescript
import type { User, Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;  // Add user for convenience
    }
  }
}
```

---

## 4. FILE STRUCTURE SUMMARY

### 4.1. New Files to Create

```
src/
├── components/
│   └── auth/
│       ├── index.ts
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── UserMenu.tsx
│       ├── LogoutButton.tsx
│       ├── PasswordInput.tsx
│       ├── AuthFormWrapper.tsx
│       └── hooks/
│           ├── useLoginForm.ts
│           ├── useRegisterForm.ts
│           └── useAuth.ts
├── db/
│   └── supabase.server.ts
├── layouts/
│   └── AuthLayout.astro
├── lib/
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── auth.error.ts
│   └── validators/
│       └── auth.validators.ts
└── pages/
    ├── login.astro
    ├── register.astro
    └── api/
        └── auth/
            ├── register.ts
            ├── login.ts
            ├── logout.ts
            └── session.ts
```

### 4.2. Files to Modify

```
src/
├── env.d.ts                    # Add User type to Locals
├── types.ts                    # Add auth DTOs
├── middleware/index.ts         # Add route protection
├── layouts/Layout.astro        # Add navigation header with auth state
└── pages/index.astro           # Ensure auth check compatible
```

### 4.3. Dependencies to Add

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.0"   // For server-side auth with cookies
  }
}
```

---

## 5. IMPLEMENTATION PRIORITIES

### Phase 1: Core Infrastructure
1. Install `@supabase/ssr` package
2. Create `supabase.server.ts`
3. Update middleware for session handling
4. Update `env.d.ts` types

### Phase 2: API Endpoints
1. Create auth validators
2. Create auth service and error types
3. Implement `/api/auth/register`
4. Implement `/api/auth/login`
5. Implement `/api/auth/logout`
6. Implement `/api/auth/session`

### Phase 3: UI Components
1. Create `AuthLayout`
2. Create form components (LoginForm, RegisterForm)
3. Create helper components (PasswordInput, UserMenu)
4. Create custom hooks

### Phase 4: Pages & Integration
1. Create login page
2. Create registration page
3. Update main Layout with navigation
4. Update index page for auth compatibility

### Phase 5: Testing & Polish
1. Test all flows against US-001 and US-002 acceptance criteria
2. Add error handling edge cases
3. Add loading states
4. Verify existing functionality not broken (US-004 through US-013)

---

## 6. COMPATIBILITY NOTES

### 6.1. Existing Functionality Preservation

**Generation Feature (US-004, US-005):**
- The `GenerationView` component continues to work as-is
- API endpoints already check `context.locals.session`
- Rate limiting remains functional

**Flashcard Management (US-006 through US-011):**
- Existing API endpoints already use session for user identification
- No changes needed to flashcard endpoints

**Review System (US-012):**
- No changes needed - uses existing session mechanism

**Database:**
- No schema changes required
- Supabase Auth handles user table internally
- Existing RLS policies work with `auth.uid()`

### 6.2. Migration Considerations

If there are existing users in development:
- Supabase Auth is separate from application tables
- Existing `user_id` references in flashcards table link to Supabase Auth users
- No data migration needed

---

## 7. OPEN QUESTIONS / DECISIONS NEEDED

1. **Email Verification:** Should registration require email verification before access? 
   - **Recommendation:** No for MVP (not specified in PRD)
   - Can be enabled later in Supabase dashboard

2. **Session Duration:** How long should sessions last?
   - **Recommendation:** Use Supabase defaults (typically 1 week with auto-refresh)
   - This satisfies US-002 criterion 4 (session persistence)

3. **Password Recovery:** Include in MVP or defer?
   - **Decision:** Defer (not in PRD MVP scope per Section 4.2)
   - Infrastructure documented for future implementation

4. **Internationalization:** Full i18n system or hardcoded Polish?
   - **Recommendation:** Hardcoded Polish for MVP (PRD examples are in Polish)
   - Can add i18n system post-MVP

5. **Rate Limiting Persistence:** Current implementation is in-memory.
   - **Recommendation:** Acceptable for MVP
   - For production, consider Redis or database-backed rate limiting

---

## 8. PRD TRACEABILITY MATRIX

| User Story | Auth Spec Coverage | Notes |
|------------|-------------------|-------|
| US-001 (Registration) | ✅ Full | Section 1.3.2, 2.1.1, Scenario 1 |
| US-002 (Login) | ✅ Full | Section 1.3.1, 2.1.2, Scenario 2-3 |
| US-003 (Password Change) | ⚠️ Partial | Not in this spec - separate feature for logged-in users |
| US-004-013 | ✅ Compatible | Existing functionality preserved |
