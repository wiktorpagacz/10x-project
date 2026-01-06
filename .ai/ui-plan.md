# UI Architecture for 10xCards

## 1. UI Structure Overview

The 10xCards application is structured around a core user workflow: **AI-assisted flashcard creation, curation, management, and spaced repetition study**. The UI consists of seven interconnected views organized to guide users through authentication, content generation, flashcard management, and study sessions. The architecture prioritizes simplicity and clarity by separating concerns into distinct views while maintaining persistent navigation for authenticated users.

The application uses a persistent sidebar navigation structure on desktop (collapsing to a hamburger menu on mobile) to enable seamless navigation between core sections: Generator (main entry point), My Flashcards (browse/manage), Study (spaced repetition), and Profile (account management).

Key architectural principles:
- **State management via state machines**: Generation workflow uses atomic states (`idle`, `generating`, `reviewing`, `saving`) to prevent invalid transitions and ensure predictable UI behavior.
- **Optimistic updates**: Write operations (save, edit, delete) update the UI immediately with rollback on failure.
- **API-first design**: All views map directly to REST API endpoints; the UI layer is thin and primarily handles presentation and user interaction.
- **Security by default**: Authentication is enforced via middleware; authorization is delegated to PostgreSQL Row-Level Security (RLS) at the database level.
- **Progressive enhancement**: The UI gracefully handles network failures with retry logic and preserves user input (e.g., textarea text) across retries.

---

## 2. View List

### 2.1 Authentication View

**Route**: `/auth?mode=login|signup`

**Main Purpose**: Authenticate users via email and password. Provides mode switching between login and signup without page reloads.

**Key Information to Display**:
- Email input field
- Password input field (login) / Password and confirm password fields (signup)
- Mode toggle/tab interface
- Validation feedback (inline error messages below fields)
- Success/error toasts for submission results
- Helpful text explaining next steps

**Key View Components**:
- Email input with validation (required, valid email format)
- Password input with validation (required, minimum length)
- Confirm password input (signup mode only)
- Mode toggle/tab interface (React-based for no-reload switching)
- Submit button (enabled only when all fields are valid)
- Error message display area
- Toast notification container

**UX, Accessibility, and Security Considerations**:
- **UX**: Tab interface for seamless mode switching without page navigation. Clear visual indication of active mode. Form validation provides immediate feedback.
- **Accessibility**: ARIA labels on input fields. Proper label-to-input associations. Focus management. Error messages programmatically associated with fields via `aria-describedby`.
- **Security**: Password field uses `type="password"`. No password hints in error messages. JWT obtained from Supabase Auth SDK stored server-side. No sensitive data in toast messages.

**Error States**:
- Invalid email format
- Email already registered (signup mode)
- Incorrect password (login mode)
- Passwords don't match (signup mode)
- Network error with retry capability

---

### 2.2 Generation View

**Route**: `/index` (default authenticated landing page)

**Main Purpose**: Primary entry point for authenticated users. Enables AI-powered flashcard generation from text input. Manages the generation workflow state machine and presents suggested flashcards for review.

**Key Information to Display**:
- Large textarea for source text input (placeholder text with instructions)
- Real-time character counter showing current/maximum characters
- Progress bar visualizing position within valid range (1000–10000 characters)
- Warning text when character count is outside valid range
- "Generate" button (disabled when invalid)
- Collapsible instructional info box (initially collapsed for returning users, expanded for new users)
- Loading state with spinner in button during generation
- Toast notifications for errors (with manual retry button after final failure)
- Suggested flashcards list (when in `reviewing` state)

**Key View Components**:
- Textarea input with character limit enforcement
- Character counter (real-time, positioned below textarea)
- Progress bar (visual representation of 1000–10000 range)
- Info box (collapsible, with instructions and character limit details)
- "Generate" button with loading spinner
- Toast notification system (for errors and retries)
- Suggested Flashcards Review component (sub-view, see section 2.3)

**UX, Accessibility, and Security Considerations**:
- **UX**: Real-time character counter provides immediate feedback. Progress bar visualizes the valid range clearly. Large textarea on mobile for better typing experience. Textarea text is preserved across retries, preventing data loss. Collapsible info box minimizes cognitive load for returning users.
- **Accessibility**: ARIA live regions announce character count updates. Aria-label on textarea. Error messages use `aria-live="polite"` for toast notifications. Loading state communicated via button text change and spinner animation.
- **Security**: Text input is validated on client and server. No sensitive data exposed in error messages. API calls include JWT authentication.

**Error States**:
- Character count below 1000 or above 10000: Warning text and disabled button
- Network error: Toast with retry button (exponential backoff: 2s, 5s, 15s)
- AI service failure: Toast with manual retry button after 3 attempts
- Connection lost: Graceful degradation with retry capability

**State Machine**:
```
idle → generating → reviewing → saving → idle
       ↓ (error)
       └─ idle (with retry button)
```

---

### 2.3 Suggested Flashcards Review (Sub-view of Generation View)

**Route**: Part of `/index` (appears conditionally in `reviewing` state)

**Main Purpose**: Present AI-generated flashcard suggestions for user curation. Allow users to accept, edit, or reject each suggestion before batch-saving to their collection.

**Key Information to Display**:
- Ordered list of compact flashcard previews (front and back text, truncated to ~100 characters with ellipsis)
- Per-card action buttons: "Accept", "Edit", "Reject"
- Summary section: "X cards to save", "Y cards rejected"
- "Save to Collection" button
- Modal overlay for editing individual cards (reuses FlashcardModal component)
- Confirmation dialog to prevent accidental navigation away during review

**Key View Components**:
- Suggested Flashcards List (card preview components)
- Action buttons per card (Accept, Edit, Reject)
- Summary display (count of cards to save/reject)
- "Save to Collection" button
- FlashcardModal component (edit mode, overlay)
- Confirmation dialog (navigation prevention)

**UX, Accessibility, and Security Considerations**:
- **UX**: Compact preview list allows rapid scanning. Quick action buttons (accept/reject/edit) are positioned consistently. Summary section provides real-time feedback on curation progress. Edit modal uses same interface as manual flashcard creation (component reuse).
- **Accessibility**: Each card preview uses semantic HTML. Action buttons have clear labels. Modal dialog has proper focus management and ARIA attributes (`role="dialog"`, `aria-labelledby`, `aria-describedby`). Keyboard navigation (Tab, Enter, Escape).
- **Security**: All card data is user-owned (enforced by RLS). Edit action updates client-side state; changes are only persisted on batch save.

**Error States**:
- Batch save failure: Toast with option to review changes or discard
- All cards rejected: "Save to Collection" disabled with message "Accept at least one card to save"

---

### 2.4 Flashcard List View

**Route**: `/flashcards`

**Main Purpose**: Display paginated list of all user's flashcards. Provide search, filtering, and sorting capabilities for discovery and management. Enable manual creation and editing of individual flashcards.

**Key Information to Display**:
- Search field (debounced 300ms, queries full-text across front and back)
- Filter dropdown: "All", "AI-Generated", "AI-Edited", "Manual"
- Sort dropdown: "Newest First" (default), "Oldest First"
- Paginated list of flashcards (20 items/page, configurable)
- Per-card display: Front text, back text (truncated), creation date, source badge
- Per-card actions: "Edit", "Delete"
- Pagination controls (previous/next buttons, page indicator)
- Loading skeleton (3–4 placeholder card shapes) while fetching
- Empty state (icon, heading, primary CTA: "Start by generating flashcards", secondary CTA: "Manually create a flashcard")
- "Add Flashcard" button (trigger FlashcardModal in create mode)

**Key View Components**:
- Search input with debounce
- Filter dropdown
- Sort dropdown
- FlashcardList (paginated results)
- FlashcardCard (per-card preview with actions)
- PaginationControls
- LoadingSkeleton
- EmptyState
- FlashcardModal (create/edit mode)
- Delete confirmation dialog

**UX, Accessibility, and Security Considerations**:
- **UX**: Search and filter controls are prominently positioned. Pagination respects search/filter state (resets to page 1 when filters change). URL query parameters persist state (`?search=...&source=ai-full&sort=created_at_desc&page=1`). Loading skeleton prevents layout shift. Empty state guides new users with dual CTAs.
- **Accessibility**: Search field has associated label and clear placeholder text. Filter/sort dropdowns use semantic `<select>` elements or properly labeled custom dropdowns. Pagination controls are keyboard navigable. Empty state message is descriptive. Loading skeleton is announced to screen readers via `aria-live` region.
- **Security**: Search queries are sent to server for full-text search (server-side index via `tsvector`). Only user's own flashcards are returned (RLS enforced). Delete action requires confirmation dialog.

**Error States**:
- No search results: "No flashcards found. Try adjusting your search."
- Fetch failure: Toast with retry button
- Delete failure: Toast with option to retry
- Network error: Graceful degradation with retry

---

### 2.5 Flashcard Create/Edit Modal

**Route**: Modal overlay (appears on `/flashcards` or `/index` during review)

**Main Purpose**: Unified interface for creating new flashcards or editing existing ones. Enforces character limits with visual feedback.

**Key Information to Display**:
- "Front" input field (max 200 characters)
- "Back" input field (max 500 characters)
- Real-time character counters for each field (displaying current/max and color-coded)
- Three-tier color system: Green (0–70%), Yellow (70–90%), Red (90–100%)
- Yellow threshold indicators at 160 chars (front) and 400 chars (back)
- Validation error messages (inline, below fields)
- "Save" button (disabled until all validations pass)
- "Cancel" button
- Modal header indicating mode (Create New Flashcard | Edit Flashcard)

**Key View Components**:
- Modal dialog container
- Front input field
- Back input field
- CharacterCounter component (per field)
- Validation message display
- Save button
- Cancel button

**UX, Accessibility, and Security Considerations**:
- **UX**: Real-time character counters with three-tier color system provide immediate feedback on space remaining. Input is prevented when limit is exceeded (error message: "Character limit exceeded. Please remove X characters."). Validation on blur (not on every keystroke) to avoid excessive error display. Save button disabled until all fields are valid, preventing submission of invalid data. Modal overlay prevents interaction with background content.
- **Accessibility**: Labels properly associated with input fields via `<label>` element or `aria-label`. Character counter updates announced via `aria-live="polite"`. Error messages use `aria-describedby` to link to input fields. Modal has proper ARIA attributes (`role="dialog"`, `aria-labelledby`, `aria-modal="true"`). Keyboard navigation (Tab, Enter, Escape).
- **Security**: Input is validated on client and server. Max lengths enforced at database level as well (front: 200 chars, back: 500 chars). Validation prevents XSS via input sanitization.

**Error States**:
- Empty "Front" field: Error message "Front side is required."
- Empty "Back" field: Error message "Back side is required."
- Character limit exceeded: Input prevention + error message
- Server validation failure: Toast with detailed message from API
- Save failure: Toast with retry button

---

### 2.6 Study Session View

**Route**: `/study`

**Main Purpose**: Present flashcards due for spaced repetition review. Guide user through study session with card flip mechanics and feedback collection.

**Key Information to Display**:
- Progress indicator at top: "Card X of Y"
- Current flashcard front side (question)
- "Flip" button to reveal answer
- Flashcard back side (answer) – initially hidden
- Feedback buttons: "Easy", "Good", "Hard" (enabled only after flip)
- Subtle transition animation between cards
- "Quit Session" button with confirmation dialog
- Empty state (if no cards due): "No cards to review today. Great job!"

**Key View Components**:
- Card display container (with flip animation)
- Progress indicator
- Flip button
- Feedback buttons (Easy, Good, Hard)
- Quit button with confirmation dialog
- Empty state component

**UX, Accessibility, and Security Considerations**:
- **UX**: Required flip-to-reveal mechanic encourages self-assessment before seeing the answer (supports spacing effect). Progress indicator motivates completion. Subtle card transition animation provides visual continuity. Quit confirmation prevents accidental session loss. Empty state message is encouraging.
- **Accessibility**: Flip button is announced as toggling answer visibility (`aria-pressed`). Progress indicator is clear and descriptive. Feedback buttons are labeled clearly. Keyboard navigation (Space to flip, arrow keys to navigate, Tab for buttons). Screen reader support for card transitions via `aria-live="polite"` announcements.
- **Security**: Feedback data is initially stored client-side (placeholder for future API integration). Card data is user-owned (RLS enforced). No sensitive data exposed.

**Error States**:
- No cards due: Empty state with message "No cards to review today. Great job!"
- Fetch failure: Toast with option to retry
- Feedback submission failure: Toast with option to continue or retry
- Session timeout: Redirect to `/flashcards` with message "Session ended. Your progress was saved."

---

### 2.7 User Profile View

**Route**: `/profile` (dedicated page) or modal overlay (accessible from header icon)

**Main Purpose**: Manage user account, view learning statistics, and adjust application settings.

**Key Information to Display**:

**Account Info Section**:
- Email display (read-only, for reference)
- Current password field (for verification)
- New password field
- Confirm password field
- Save button (password change form)

**Statistics Section** (read-only, calculated from cached data or future API):
- Total flashcards created
- Total AI-generated flashcards
- Total studies completed
- Cards reviewed this week

**Settings Section**:
- Theme preference toggle (Light / Dark)
- Notification preferences (future extensibility)

**Key View Components**:
- Profile header
- Account Info section (password change form)
- Statistics section (display only)
- Settings section (toggle and future options)
- Save button (password form)
- Success/error toasts

**UX, Accessibility, and Security Considerations**:
- **UX**: Organized into three clear sections for easy scanning. Statistics are read-only (no edit buttons). Theme toggle provides immediate visual feedback. Password change form uses same validation rigor as signup form (minimum length, confirmation match).
- **Accessibility**: Section headings use semantic HTML (`<h2>`, `<h3>`). Labels properly associated with inputs. Password field validation feedback is clear. Theme toggle has associated label. Focus management is maintained through form interactions.
- **Security**: Password change requires current password verification (prevents unauthorized change). Password fields use `type="password"`. No password hints in error messages. Password change is handled via Supabase Auth SDK (recommended) or dedicated API endpoint. Theme preference stored in localStorage (client-side) to avoid database bloat.

**Error States**:
- Incorrect current password: "Current password is incorrect."
- New passwords don't match: "Passwords do not match."
- Password change failure: Toast with retry button
- Network error: Graceful degradation with retry

---

## 3. User Journey Map

### 3.1 Primary Journey: AI Flashcard Generation and Learning

**Scenario**: New user wants to quickly generate flashcards from study material.

**Steps**:

1. **Entry**: User lands on `/auth?mode=signup` → Creates account (email + password)
2. **Post-Auth**: Redirected to `/index` (Generation View)
3. **Generation**: User pastes study material into textarea → Sees character counter and progress bar → Clicks "Generate"
4. **Loading**: System shows spinner in button → Calls `POST /generations` API → Returns suggested flashcards
5. **Review**: Suggested Flashcards Review displays compact card list → User accepts, edits (modal), or rejects each card
6. **Save**: User clicks "Save to Collection" → System calls `POST /flashcards/batch` → Optimistic UI update
7. **Success**: Redirects to `/flashcards` → User sees newly created flashcards in list
8. **Discovery**: User can search, filter, or sort flashcards → Returns to Generation View via sidebar

### 3.2 Secondary Journey: Study Session

**Scenario**: User wants to practice spaced repetition with flashcards.

**Steps**:

1. **Entry**: User clicks "Study" in sidebar navigation
2. **Fetch**: System calls `GET /reviews` → Fetches cards due today
3. **Study**: Study Session View displays first card (front side) → User reads and thinks
4. **Flip**: User clicks "Flip" button → Back side (answer) revealed
5. **Feedback**: User clicks one of three feedback buttons: "Easy", "Good", "Hard"
6. **Transition**: Subtle animation → Next card displayed (or "No more cards" if session complete)
7. **Quit**: User clicks "Quit Session" → Confirmation dialog → Redirected to `/flashcards`

### 3.3 Tertiary Journey: Manual Flashcard Management

**Scenario**: User wants to manually create or edit individual flashcards.

**Steps**:

1. **Entry**: User navigates to `/flashcards` (Flashcard List View)
2. **Create**: Clicks "Add Flashcard" button → FlashcardModal opens in `create` mode
3. **Input**: User enters front text (question) and back text (answer) → Character counters provide feedback
4. **Save**: Clicks "Save" → System calls `POST /flashcards` → Card added to list
5. **Edit**: User clicks "Edit" on any card → FlashcardModal opens in `edit` mode with pre-filled content
6. **Update**: User modifies text → Clicks "Save" → System calls `PUT /flashcards/{id}` → List updates
7. **Delete**: User clicks "Delete" → Confirmation dialog → System calls `DELETE /flashcards/{id}` → Card removed

### 3.4 Account Management Journey

**Scenario**: User wants to change password and view statistics.

**Steps**:

1. **Entry**: User clicks profile icon in header → User Profile View opens (modal or dedicated page)
2. **Account**: User navigates to "Account Info" section → Enters current and new password → Clicks "Save"
3. **Verification**: System verifies current password via Supabase Auth SDK → Password updated
4. **Statistics**: User views statistics section (total cards, AI-generated, studies, weekly reviewed)
5. **Settings**: User toggles theme preference → Changes apply immediately (stored in localStorage)
6. **Close**: User closes modal or navigates away

### 3.5 Error Recovery Journey

**Scenario**: User experiences network error during generation.

**Steps**:

1. **Generation Fails**: System detects failure → Retry with exponential backoff (2s, 5s, 15s)
2. **After 3 Attempts**: Final failure toast displayed → "Retry" button shown
3. **Manual Retry**: User clicks "Retry" button → System retries generation
4. **Success**: If successful, Suggested Flashcards Review displayed
5. **Persistent Data**: Textarea text preserved throughout retries

---

## 4. Layout and Navigation Structure

### 4.1 Navigation Hierarchy

**Authenticated Routes** (with persistent sidebar):
```
/index (Generation View) ← Default landing
├── Sidebar Navigation
│   ├── Generator (icon + label, links to /index)
│   ├── My Flashcards (icon + label, links to /flashcards)
│   ├── Study (icon + label, links to /study)
│   └── Profile (icon + label, opens modal or links to /profile)
├── Header
│   ├── View title (dynamic)
│   ├── Search/filter controls (flashcards view only)
│   └── Profile icon (opens modal)
└── Main content area
    └── [View-specific content]

/flashcards (Flashcard List View)
├── Sidebar Navigation (same as above)
├── Header
│   ├── "My Flashcards" title
│   ├── Search field
│   ├── Filter dropdown
│   ├── Sort dropdown
│   └── Add Flashcard button
└── Main content area
    └── Paginated flashcard list

/study (Study Session View)
├── Sidebar Navigation (same as above)
├── Header
│   ├── "Study Session" title
│   └── Progress indicator (Card X of Y)
└── Main content area
    └── Flashcard flip interface

/profile (User Profile View) [Optional dedicated page]
├── Sidebar Navigation (same as above)
├── Header
│   ├── "Profile" title
│   └── Close button (if modal)
└── Main content area
    └── Account, Statistics, Settings sections
```

**Unauthenticated Routes**:
```
/auth (Authentication View)
└── Email + password form
    ├── Login tab
    └── Signup tab
```

### 4.2 Navigation Flow

**Desktop (md breakpoint and above)**:
- Persistent left sidebar with icon + label navigation items
- Sidebar remains visible across all authenticated views
- Profile icon in header opens modal overlay
- Main content area adjusts for sidebar width

**Mobile (< md breakpoint)**:
- Sidebar collapses into hamburger menu (top-left or bottom-center)
- Hamburger menu toggles collapsible sidebar navigation
- Profile icon in header remains for quick access
- Main content area expands to full width when sidebar collapsed
- Bottom tab navigation (alternative): icons for Generator, My Flashcards, Study, Profile

### 4.3 Route Protection and Redirects

- **Unauthenticated users**: Middleware redirects `/` and any protected route to `/auth?mode=login`
- **Authenticated users**: Direct access to protected routes; `/auth` redirects to `/index`
- **Session expiration**: Middleware detects invalid JWT → Redirect to `/auth?mode=login` with message "Session expired. Please log in again."

### 4.4 Persistent State Across Navigation

- **Textarea text** (Generation View): Preserved via client-side state when navigating away and back
- **Search/filter state** (Flashcard List): Persisted in URL query parameters
- **Theme preference**: Stored in localStorage; persists across sessions
- **Authentication state**: JWT stored server-side (Supabase); user context attached to `context.locals`

---

## 5. Key Components

### 5.1 Shared UI Components

**CharacterCounter**
- Displays current character count and maximum limit
- Real-time updates as user types
- Three-tier color system: Green (0–70%), Yellow (70–90%), Red (90–100%)
- Used in: Generation View (textarea), FlashcardModal (front and back fields)

**FlashcardModal**
- Reusable modal for creating and editing flashcards
- Mode prop: `create` | `edit`
- Pre-fills fields when in edit mode
- Enforces character limits with validation and input prevention
- Used in: Flashcard List View, Suggested Flashcards Review

**PaginationControls**
- Previous/Next buttons
- Page indicator (Current page / Total pages)
- Jump-to-page input (optional)
- Used in: Flashcard List View

**LoadingSkeleton**
- Placeholder card shapes (3–4) indicating loading state
- Prevents layout shift when data arrives
- Announced to screen readers via `aria-live`
- Used in: Flashcard List View (initial load)

**EmptyState**
- Icon, heading, and dual CTA buttons
- Primary CTA: "Start by generating flashcards"
- Secondary CTA: "Manually create a flashcard"
- Used in: Flashcard List View (when no cards exist)

**Toast Notification**
- Brief message at top or bottom of screen
- Auto-dismisses after 5 seconds (or user closes)
- Types: Success, Error, Warning, Info
- Error toasts can include "Retry" button
- Used in: All views (errors, confirmations)

**Sidebar Navigation**
- Persistent left sidebar on desktop
- Collapses to hamburger menu on mobile
- Menu items: Generator, My Flashcards, Study, Profile
- Icons + labels for clarity
- Active state indication for current route

**ConfirmationDialog**
- Modal overlay for critical actions (delete, quit, navigation away)
- Confirm/Cancel buttons
- Clear warning message
- Used in: Delete flashcard, Quit study session, Navigation prevention during review

**ProgressBar**
- Visual representation of numeric progress
- Used for: Character count range (1000–10000) in Generation View, Card progress in Study Session View

**AuthForm**
- React component with tab/toggle for login/signup modes
- Email and password fields
- Validation feedback (inline error messages)
- Submit button
- Used in: Authentication View

**ReviewFeedback** (MVP Placeholder)
- Displays feedback buttons: Easy, Good, Hard
- Collects user response to flashcard (currently client-side storage)
- Future integration with logging API endpoint
- Used in: Study Session View

**FlashcardCard**
- Compact display of single flashcard (front + back preview)
- Action buttons: Edit, Delete (in list view) or Accept, Edit, Reject (in review view)
- Metadata: Creation date, source badge (AI-Generated, AI-Edited, Manual)
- Used in: Flashcard List View, Suggested Flashcards Review

---

## 6. State Management Strategy

### 6.1 Global Application State

**Authentication State**:
- User object (email, user_id, session)
- JWT token (stored server-side; never exposed to client)
- Handled by: Supabase Auth SDK + custom `useAuth()` hook

**Generation Workflow State** (in-memory, ephemeral):
- `generationState`: `idle` | `generating` | `reviewing` | `saving`
- `sourceText`: User's textarea input
- `suggestedFlashcards`: Array of AI-generated suggestions
- `reviewedFlashcards`: Array with user's accept/edit/reject decisions
- Handled by: React context or component-level state

**Flashcard List State** (with caching):
- `flashcards`: Array of user's flashcards
- `currentPage`, `pageSize`: Pagination state
- `searchQuery`: Search input value
- `filterSource`: Selected source filter
- `sortOrder`: Sort direction
- Cache TTL: 5 minutes; manual refresh capability
- Handled by: React state + caching service

**Theme State**:
- `theme`: `light` | `dark`
- Persisted in: localStorage
- Handled by: React context

### 6.2 API Data Flow

**Read Operations** (GET requests):
- Fetch data from API
- Cache result with 5-minute TTL
- Display in UI
- User can trigger manual refresh

**Write Operations** (POST, PUT, DELETE):
- Optimistic update: Update UI immediately
- Send request to API
- On success: Keep optimistic update
- On failure: Rollback UI; show error toast with retry option

---

## 7. Accessibility and Security Integration

### 7.1 Accessibility Across All Views

- **Semantic HTML**: Use `<button>`, `<input>`, `<label>`, `<form>` elements for proper structure
- **ARIA Landmarks**: Identify regions (`<main>`, `<nav>`, `<aside>`) for screen reader navigation
- **ARIA Roles**: Apply roles to custom elements (e.g., `role="dialog"` for modals)
- **ARIA Labels**: Use `aria-label` for icon-only buttons; use `aria-labelledby` for headings
- **ARIA Live Regions**: Announce dynamic updates (toasts, character counts) via `aria-live="polite"`
- **Keyboard Navigation**: Support Tab, Enter, Escape, arrow keys
- **Focus Management**: Trap focus in modals; restore focus on close
- **Color Contrast**: Ensure 4.5:1 contrast ratio for text; don't rely on color alone for meaning
- **Loading States**: Communicate async operations to screen readers (spinner + text)

### 7.2 Security Across All Views

- **Authentication**: JWT-based via Supabase; only valid tokens access protected routes
- **Authorization**: PostgreSQL RLS ensures users only access their own data; API enforces ownership checks
- **Input Validation**: Validate on client (UX) and server (security); prevent XSS via sanitization
- **Password Security**: Use Supabase Auth for password management; never send plain text in logs
- **HTTPS Only**: All API calls require HTTPS; no sensitive data in URLs
- **Error Messages**: Never expose technical details; use user-friendly messages
- **CSRF Protection**: Handled by Astro framework (form tokens)
- **Rate Limiting**: Implement on API endpoints to prevent abuse (future consideration)

---

## 8. Appendix: User Story to UI Mapping

| User Story | Primary View | Key Components | API Endpoint |
|---|---|---|---|
| US-001: Register | Auth View | AuthForm (signup mode) | Supabase Auth SDK |
| US-002: Login | Auth View | AuthForm (login mode) | Supabase Auth SDK |
| US-003: Change Password | User Profile View | Password form (Account Info) | Supabase Auth SDK or `PUT /user/password` |
| US-004: Generate flashcards | Generation View | Textarea, Character Counter, Generate button | `POST /generations` |
| US-005: Review generated flashcards | Suggested Flashcards Review | FlashcardCard, Action buttons, FlashcardModal (edit) | `POST /flashcards/batch` |
| US-006: Manual flashcard creation | Flashcard List View or Generation View | FlashcardModal (create mode) | `POST /flashcards` |
| US-007: Browse flashcards | Flashcard List View | FlashcardCard list, Pagination | `GET /flashcards` |
| US-008: Empty state guidance | Flashcard List View | EmptyState component | N/A |
| US-009: Search flashcards | Flashcard List View | Search input, Filter/Sort dropdowns | `GET /flashcards?search=...` |
| US-010: Edit flashcard | Flashcard List View | FlashcardModal (edit mode) | `PUT /flashcards/{id}` |
| US-011: Delete flashcard | Flashcard List View | ConfirmationDialog, Delete action | `DELETE /flashcards/{id}` |
| US-012: Study session | Study Session View | Card flip, Feedback buttons, Progress indicator | `GET /reviews` |
| US-013: Event logging | (Backend) | N/A (handled by API logic) | Implicit in write operations |

---

**Document Status**: UI Architecture Complete  
**Next Phase**: Component Implementation & API Integration  
**Last Updated**: January 6, 2026
