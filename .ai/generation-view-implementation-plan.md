# View Implementation Plan: Generation View

## 1. Overview

The **Generation View** is the primary entry point for authenticated users in the 10xCards application. It serves as the central hub for the AI-powered flashcard generation workflow. The view manages a state machine that guides users through the complete journey: text input validation → AI generation → flashcard review/curation → batch saving to the collection.

The view combines the generation interface (textarea for source text, character validation, progress feedback) with the review interface (AI-suggested flashcard curation with individual card actions). It provides real-time feedback through character counters, progress visualization, loading states, and comprehensive error handling with retry capabilities.

---

## 2. View Routing

**Route**: `/index` (default authenticated landing page)

- This is the primary landing page after user authentication
- Accessible only to authenticated users (enforced by Astro middleware)
- Uses authentication context from `context.locals.supabase` and `context.locals.user`
- No dynamic parameters in URL

---

## 3. Component Structure

```
GenerationView (Astro page: src/pages/index.astro)
├── TextInputSection (React interactive)
│   ├── Textarea input
│   ├── CharacterCounter (sub-component)
│   └── ProgressBar (sub-component)
├── InfoBox (React interactive, collapsible)
├── GenerateButton (React interactive)
├── Toast Container (React interactive)
│   └── Toast (conditional, auto-dismiss)
├── SuggestedFlashcardsReview (React interactive) [conditional: reviewing state]
│   ├── FlashcardPreviewCard (React) [mapped array]
│   │   ├── Card preview text
│   │   ├── Accept button
│   │   ├── Edit button
│   │   └── Reject button
│   ├── Summary display
│   └── Save to Collection button
├── FlashcardModal (React interactive) [conditional: card editing mode]
│   ├── Modal backdrop
│   ├── Modal header
│   ├── Front input field
│   ├── Back input field
│   ├── CharacterCounter components (per field)
│   ├── Validation error messages
│   ├── Save button
│   └── Cancel button
└── ConfirmDialog (React interactive) [conditional: navigation warning]
    ├── Dialog backdrop
    ├── Confirmation message
    ├── Confirm button
    └── Cancel button
```

---

## 4. Component Details

### 4.1 GenerationView (Astro Page)

**Component Description**: Main page component that serves as the orchestrator for the entire generation workflow. Manages the state machine (idle → generating → reviewing → saving → idle), coordinates between all child components, handles API calls via custom hooks, and manages error states with retry logic.

**Main Elements**:
- Layout wrapper with Astro Layout component
- TextInputSection for text input and generation initiation
- InfoBox for collapsible instructions
- GenerateButton to trigger generation
- Toast container for notifications
- SuggestedFlashcardsReview (conditionally rendered in reviewing state)
- FlashcardModal for card editing (conditionally rendered)
- ConfirmDialog for navigation warnings (conditionally rendered)

**Handled Events**:
- User text input (onChange in TextInputSection)
- Generate button click (triggers POST /generations)
- Generation success (transition to reviewing state)
- Generation error (show toast, remain in idle/error state)
- Retry after error (preserve sourceText, restart generation)
- Card accept/reject/edit during review
- Save to collection (triggers POST /flashcards/batch)
- Save success (navigate to flashcards list)
- Save error (show toast with retry option)
- Navigation attempt during review (show confirm dialog)

**Handled Validation**:
- sourceText length: 1000–10000 characters (enforced at UI and API level)
- Empty or whitespace-only text rejected
- Button disabled state based on character validation
- At least one card must be accepted before saving
- Session validation (401 error → redirect to login)

**Types**:
- GenerationViewState
- SuggestedFlashcardWithState
- ErrorInfo
- Toast

**Props**: None (Astro page component, receives data via context.locals)

---

### 4.2 TextInputSection

**Component Description**: Composite React component that manages text input for AI generation. Provides a textarea with character limit enforcement, real-time character counter, progress bar visualization, and warning feedback. Coordinates onChange events with parent state and validates input against limits.

**Main Elements**:
- Textarea with placeholder text ("Paste your study material here...")
- CharacterCounter sub-component below textarea
- ProgressBar sub-component showing 1000–10000 range
- Warning text displayed when character count outside valid range
- Accessible label associated with textarea

**Handled Events**:
- onChangeText (onChange on textarea): updates sourceText, triggers character counter update, enables/disables generate button
- onGenerateClick (bubbles up to parent): initiates POST /generations call

**Handled Validation**:
- sourceText.length >= 1000: show warning "Text must be at least 1,000 characters"
- sourceText.length <= 10000: show warning "Text cannot exceed 10,000 characters"
- sourceText.trim().length === 0: show warning "Text cannot be empty"
- characterCounter.isValid controls GenerateButton disabled state

**Types**:
- CharacterCounterModel
- ProgressBarModel

**Props**:
```typescript
interface TextInputSectionProps {
  sourceText: string;
  isGenerating: boolean;
  onChangeText: (text: string) => void;
  onGenerateClick: () => void;
}
```

---

### 4.3 CharacterCounter

**Component Description**: Reusable sub-component (or custom hook) that displays current character count vs. maximum with color-coded status and percentage. Used in both TextInputSection (for 1000–10000 range) and FlashcardModal (for front: 200, back: 500 limits). Provides visual feedback on proximity to limits.

**Main Elements**:
- Text displaying "X / Y characters"
- Color-coded indicator (Green: 0–70%, Yellow: 70–90%, Red: 90–100%)
- Progress indicator or visual bar (optional enhancement)

**Handled Events**: None (read-only, receives data via props/input)

**Handled Validation**:
- Calculates percentage: (current / max) * 100
- Determines status: valid (0–70%), warning (70–90%), error (90–100%)
- Communicates validity to parent for button enable/disable logic

**Types**:
- CharacterCounterModel

**Props**:
```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
  threshold?: number; // Optional: highlight threshold (default 70)
  label?: string; // Optional: display label (e.g., "Front", "Back")
}
```

---

### 4.4 ProgressBar

**Component Description**: Visual component displaying the valid character range (1000–10000) as a horizontal progress bar. Shows the current position within this range and indicates whether the input is within, below, or above the valid range.

**Main Elements**:
- Horizontal progress bar (Tailwind based)
- Min marker (1000 chars)
- Max marker (10000 chars)
- Current position indicator (filled portion of bar)
- Minimum and maximum labels

**Handled Events**: None (read-only)

**Handled Validation**:
- Calculates percentage based on min/max: ((current - min) / (max - min)) * 100
- Clamps to 0–100% for display (shows "out of range" state if needed)

**Types**:
- ProgressBarModel

**Props**:
```typescript
interface ProgressBarProps {
  current: number;
  min: number; // 1000
  max: number; // 10000
}
```

---

### 4.5 InfoBox

**Component Description**: Collapsible informational component that displays instructions and character limit details. Initially collapsed for returning users, expanded for new users (determined by localStorage or user preference). Reduces cognitive load while providing important guidance.

**Main Elements**:
- Collapsible header with expand/collapse icon
- Hidden/visible content with instructions and limits
- Typography for clear readability

**Handled Events**:
- onToggle: toggles expanded state, persists to localStorage

**Handled Validation**: None

**Types**:
- InfoBoxState (isExpanded)

**Props**:
```typescript
interface InfoBoxProps {
  isExpanded: boolean;
  onToggle: (isExpanded: boolean) => void;
}
```

---

### 4.6 GenerateButton

**Component Description**: Primary call-to-action button that initiates the flashcard generation workflow. Disabled when character validation fails, shows loading spinner during API call, and provides visual feedback on interaction state.

**Main Elements**:
- Button element
- Loading spinner icon (conditionally rendered)
- Text: "Generate Flashcards" (or "Generating..." during loading)
- Disabled state when: sourceText outside valid range or generation in progress

**Handled Events**:
- onClick: triggers generation (called only if validation passes, prevents bubbling)

**Handled Validation**:
- Disabled if sourceText.length < 1000 or > 10000
- Disabled if isGenerating === true (no double-submission)

**Types**: None (simple button component)

**Props**:
```typescript
interface GenerateButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}
```

---

### 4.7 SuggestedFlashcardsReview

**Component Description**: Composite component that displays and manages the curation workflow for AI-generated flashcard suggestions. Shows a list of compact card previews, allows per-card actions (accept/reject/edit), displays curation progress summary, and coordinates batch saving. Central to the review state of the state machine.

**Main Elements**:
- Header ("Review and Accept Flashcards")
- List of FlashcardPreviewCard components (mapped from suggestedFlashcards array)
- Summary display ("X cards to save, Y cards rejected")
- Save to Collection button (disabled if acceptedCount === 0)
- Message when all cards rejected: "Accept at least one card to save"

**Handled Events**:
- onAcceptCard (via FlashcardPreviewCard): updates card status to 'accepted', increments acceptedCount
- onRejectCard (via FlashcardPreviewCard): removes card from list, increments rejectedCount
- onEditCard (via FlashcardPreviewCard): opens FlashcardModal with selected card index
- onSaveToCollection (via Save button): triggers POST /flashcards/batch with accepted cards

**Handled Validation**:
- acceptedCount > 0: enables Save to Collection button
- acceptedCount === 0: disables Save to Collection button, shows message
- All cards rejected: "Save to Collection" button remains disabled

**Types**:
- SuggestedFlashcardWithState
- SuggestedFlashcardsReviewState

**Props**:
```typescript
interface SuggestedFlashcardsReviewProps {
  cards: SuggestedFlashcardWithState[];
  onAcceptCard: (cardIndex: number) => void;
  onRejectCard: (cardIndex: number) => void;
  onEditCard: (cardIndex: number) => void;
  onSaveToCollection: () => void;
  isSaving: boolean;
}
```

---

### 4.8 FlashcardPreviewCard

**Component Description**: Individual card preview component within the SuggestedFlashcardsReview list. Displays truncated front and back text (approx. 100 characters each with ellipsis), action buttons, and visual indication of card status (pending/accepted/rejected).

**Main Elements**:
- Card container with conditional styling (pending/accepted/rejected state)
- Front text (truncated, max 100 chars with ellipsis)
- Back text (truncated, max 100 chars with ellipsis)
- Three action buttons: Accept, Edit, Reject
- Status indicator (optional: badge showing "Accepted", "Pending", etc.)

**Handled Events**:
- onAcceptClick: calls parent's onAcceptCard with card index
- onEditClick: calls parent's onEditCard with card index
- onRejectClick: calls parent's onRejectCard with card index

**Handled Validation**:
- Visual state reflects card status (pending: normal, accepted: highlighted green, rejected: hidden or greyed)
- Buttons only available for pending cards (accepted/rejected cards show read-only state)

**Types**:
- SuggestedFlashcardWithState

**Props**:
```typescript
interface FlashcardPreviewCardProps {
  card: SuggestedFlashcardWithState;
  cardIndex: number;
  onAccept: (index: number) => void;
  onEdit: (index: number) => void;
  onReject: (index: number) => void;
}
```

---

### 4.9 FlashcardModal

**Component Description**: Reusable modal dialog for creating and editing flashcards. Used both for manual flashcard creation (elsewhere in app) and for editing AI suggestions during review. Enforces character limits (front: 200, back: 500) with real-time feedback, validates required fields, and coordinates form submission.

**Main Elements**:
- Modal backdrop (click to close)
- Modal container with fixed positioning
- Header ("Create New Flashcard" | "Edit Flashcard")
- Front input field (textarea or text input)
- Front CharacterCounter sub-component
- Back input field (textarea)
- Back CharacterCounter sub-component
- Validation error messages (displayed inline below fields)
- Save button (disabled until valid)
- Cancel button

**Handled Events**:
- onChangeFront: updates front value, validates, updates character counter
- onChangeBack: updates back value, validates, updates character counter
- onSaveClick: validates both fields, calls onSave if valid
- onCancelClick: resets state, closes modal
- onBackdropClick: closes modal (if no unsaved changes, or shows confirm)

**Handled Validation**:
- front.length > 0: required field, error "Front side is required."
- front.length <= 200: max length, error "Front side cannot exceed 200 characters."
- back.length > 0: required field, error "Back side is required."
- back.length <= 500: max length, error "Back side cannot exceed 500 characters."
- Character counter status: Green (0–70%), Yellow (70–90%), Red (90–100%)
- Save button disabled if any validation fails

**Types**:
- FlashcardModalState
- CharacterCounterModel

**Props**:
```typescript
interface FlashcardModalProps {
  isOpen: boolean;
  isEditingMode: boolean; // true for edit, false for create
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
  };
  onChangeFront: (text: string) => void;
  onChangeBack: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}
```

---

### 4.10 Toast

**Component Description**: Notification component for displaying errors, info, and success messages. Supports auto-dismiss with configurable duration, manual dismiss button, and optional retry button for retryable errors. Uses aria-live for accessibility.

**Main Elements**:
- Toast container (positioned fixed at bottom-right or top-right)
- Icon indicating type (error, info, success)
- Message text
- Close button (dismiss)
- Retry button (if retryable and onRetry provided)
- Auto-dismiss timer

**Handled Events**:
- onDismiss: removes toast from queue
- onRetry (if provided): calls retry callback, optionally auto-closes

**Handled Validation**: None

**Types**:
- Toast

**Props**:
```typescript
interface ToastProps {
  id: string;
  type: 'error' | 'info' | 'success';
  message: string;
  retryable: boolean;
  onDismiss: (id: string) => void;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number; // ms, default 5000
}
```

---

### 4.11 ConfirmDialog

**Component Description**: Modal confirmation dialog preventing accidental navigation during the review state. Displays a confirmation message and buttons to proceed or cancel. Integrated with browser beforeunload event.

**Main Elements**:
- Modal backdrop
- Modal container
- Message: "You have unsaved changes. Discard?"
- Confirm button ("Discard and Leave")
- Cancel button ("Keep Reviewing")

**Handled Events**:
- onConfirm: allows navigation
- onCancel: prevents navigation

**Handled Validation**: None (modal state controls visibility)

**Types**: None

**Props**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## 5. Types

### 5.1 View State Types

#### GenerationViewState
Represents the complete state of the Generation View, managing the state machine transitions and all associated data.

```typescript
type GenerationViewStateType = 'idle' | 'generating' | 'reviewing' | 'saving' | 'error';

interface GenerationViewState {
  // State machine status
  status: GenerationViewStateType;
  
  // User input and API response data
  sourceText: string; // Preserved across retries
  suggestedFlashcards: SuggestedFlashcardWithState[]; // Cards from API response
  generationId: number | null; // ID from POST /generations response
  
  // Review/editing state
  selectedCardIndex: number | null; // Index of card being edited
  isEditing: boolean; // true when FlashcardModal is open
  
  // Error handling
  error: ErrorInfo | null; // Current error state
  retryCount: number; // Counter for exponential backoff
  
  // Toast management
  toasts: Toast[]; // Active toast notifications
  
  // Modal states
  infoBoxExpanded: boolean;
  confirmDialogOpen: boolean;
}
```

#### SuggestedFlashcardWithState
Extends the API's SuggestedFlashcardDto with client-side state tracking for the review workflow.

```typescript
interface SuggestedFlashcardWithState {
  // From API response (SuggestedFlashcardDto)
  front: string;
  back: string;
  source: 'ai-full';
  
  // Client-side tracking
  id: string; // Unique client-side ID (e.g., UUID or index-based string)
  status: 'pending' | 'accepted' | 'rejected'; // Review status
}
```

#### ErrorInfo
Encapsulates error details for consistent error handling and display.

```typescript
interface ErrorInfo {
  code: string; // Error code from API (e.g., 'NETWORK_ERROR', 'NO_FLASHCARDS_GENERATED')
  message: string; // User-friendly error message
  retryable: boolean; // Whether error allows retry
}
```

#### Toast
Notification state for toast messages.

```typescript
interface Toast {
  id: string; // Unique ID for toast
  type: 'error' | 'info' | 'success';
  message: string;
  retryable: boolean;
  autoClose: boolean;
  duration?: number; // ms before auto-close (default 5000)
  onRetry?: () => void; // Callback for retry button
}
```

### 5.2 Component-Specific Types

#### CharacterCounterModel
Data model for character count feedback and validation.

```typescript
interface CharacterCounterModel {
  current: number; // Current character count
  max: number; // Maximum allowed characters
  percentage: number; // (current / max) * 100
  status: 'valid' | 'warning' | 'error'; // Status based on percentage
  isValid: boolean; // true if current >= min and current <= max
}

// For TextInputSection specifically:
interface TextInputCharacterCounterModel extends CharacterCounterModel {
  min: number; // 1000
  max: number; // 10000
  isValid: boolean; // true if 1000 <= current <= 10000
}

// For FlashcardModal fields:
interface FieldCharacterCounterModel extends CharacterCounterModel {
  maxWarningThreshold: number; // Percentage at which to warn (default 70)
  maxErrorThreshold: number; // Percentage at which to block (default 100, but we prevent input before this)
}
```

#### ProgressBarModel
Data model for progress bar visualization.

```typescript
interface ProgressBarModel {
  current: number; // Current character count
  min: number; // 1000
  max: number; // 10000
  percentage: number; // ((current - min) / (max - min)) * 100, clamped to 0-100
  inRange: boolean; // true if min <= current <= max
}
```

#### FlashcardModalState
State specific to the FlashcardModal component.

```typescript
interface FlashcardModalState {
  isOpen: boolean;
  isEditingMode: boolean; // true for edit, false for create
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
  };
}
```

#### SuggestedFlashcardsReviewState
Derived state for the review component, calculated from GenerationViewState.

```typescript
interface SuggestedFlashcardsReviewState {
  cards: SuggestedFlashcardWithState[];
  acceptedCount: number; // Count of cards with status === 'accepted'
  rejectedCount: number; // Count of cards with status === 'rejected'
  pendingCount: number; // Count of cards with status === 'pending'
  isSaving: boolean; // true when POST /flashcards/batch in flight
  error: ErrorInfo | null; // Error from batch save
}
```

#### InfoBoxState
State for collapsible info box.

```typescript
interface InfoBoxState {
  isExpanded: boolean;
}
```

### 5.3 API Request/Response Types (from types.ts)

These types are already defined in `src/types.ts` and should be imported:

```typescript
// From types.ts
import type { CreateGenerationCommand } from 'src/types'; // { source_text: string }
import type { CreateGenerationResponseDto } from 'src/types'; // { generation_id, suggested_flashcards[], generated_count }
import type { SuggestedFlashcardDto } from 'src/types'; // { front, back, source }
import type { CreateFlashcardsBatchCommand } from 'src/types'; // { generation_id, flashcards[] }
import type { FlashcardDto } from 'src/types'; // Result of batch create
```

---

## 6. State Management

### 6.1 Main State Hook: useGenerationViewState

A custom React hook that encapsulates the complete state machine and state transitions for the Generation View.

**State Variables**:
- `status`: Current state (idle, generating, reviewing, saving, error)
- `sourceText`: User input (preserved across retries)
- `suggestedFlashcards`: Array of cards with state
- `generationId`: ID from API response
- `selectedCardIndex`: Index of card being edited (-1 if none)
- `isEditing`: Modal open flag
- `error`: Current error info
- `retryCount`: Counter for exponential backoff
- `toasts`: Array of active toasts
- `infoBoxExpanded`: Boolean for collapsible box
- `confirmDialogOpen`: Boolean for navigation confirmation

**Methods**:
- `setSourceText(text: string)`: Updates sourceText
- `startGeneration()`: Validates sourceText, sets status → generating, clears error
- `completeGeneration(response: CreateGenerationResponseDto)`: Sets suggestedFlashcards, generationId, status → reviewing
- `setGenerationError(error: ErrorInfo)`: Sets error, status → error, maintains sourceText
- `retryGeneration()`: Increments retryCount, attempts generation again with exponential backoff
- `acceptCard(index: number)`: Updates suggestedFlashcards[index].status → accepted
- `rejectCard(index: number)`: Updates suggestedFlashcards[index].status → rejected
- `selectCardForEdit(index: number)`: Sets selectedCardIndex, opens modal
- `updateEditedCard(front: string, back: string)`: Updates suggestedFlashcards[selectedCardIndex], marks as accepted, closes modal
- `cancelEdit()`: Closes modal without changes
- `startSave()`: Sets status → saving
- `completeSave()`: Resets all state, status → idle (should trigger navigation)
- `setSaveError(error: ErrorInfo)`: Sets error, status → error
- `addToast(toast: Toast)`: Adds toast to toasts array
- `removeToast(id: string)`: Removes toast by id
- `toggleInfoBox()`: Toggles infoBoxExpanded, persists to localStorage
- `openConfirmDialog()`: Sets confirmDialogOpen → true
- `closeConfirmDialog()`: Sets confirmDialogOpen → false
- `resetState()`: Clears all state for fresh start

**Implementation Notes**:
- Use useCallback for methods to prevent unnecessary re-renders
- Persist sourceText to localStorage as fallback
- Persist infoBoxExpanded state to localStorage
- Implement exponential backoff: delay = Math.min(2000 * Math.pow(2, retryCount), 15000)
- Do not clear sourceText or suggestedFlashcards on error to enable smart retries

### 6.2 Additional Custom Hooks

#### useCharacterCounter

Reusable hook for character count calculation and validation.

```typescript
function useCharacterCounter(
  text: string,
  min?: number,
  max?: number,
  warningThreshold?: number
): CharacterCounterModel {
  // Returns { current, max, percentage, status, isValid }
  // status: 'valid' if current <= max and (min ? current >= min : true)
  // status: 'warning' if percentage >= warningThreshold (default 70)
  // status: 'error' if current > max or current < min
}
```

#### useFlashcardModal

Hook managing FlashcardModal state and validation.

```typescript
function useFlashcardModal(
  initialFront?: string,
  initialBack?: string
): {
  state: FlashcardModalState;
  setFront: (text: string) => void;
  setBack: (text: string) => void;
  validate: () => boolean;
  reset: () => void;
  openForCreate: () => void;
  openForEdit: (front: string, back: string) => void;
  close: () => void;
} {
  // Manages front, back, errors, isOpen, isEditingMode
  // Validates front (1-200 chars), back (1-500 chars)
  // Returns validation errors in state.errors
}
```

#### useToastNotifications

Hook managing toast queue and auto-dismiss.

```typescript
function useToastNotifications(): {
  toasts: Toast[];
  showToast: (message: string, type: 'error' | 'info' | 'success', options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  showErrorWithRetry: (message: string, onRetry: () => void) => void;
} {
  // Manages toast array, auto-dismiss timers
  // Returns toast state and helper functions
}
```

#### useConfirmDialog

Hook for preventing navigation during review.

```typescript
function useConfirmDialog(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: () => void;
} {
  // Manages confirmation dialog state
  // Should integrate with browser beforeunload event
}
```

### 6.3 State Transitions

```
idle ──→ generating ──→ reviewing ──→ saving ──→ idle
 ↑          ↓            ↓            ↓
 └─────────error ←──────┴────────────┘
            (with retry)
```

**Transition Details**:
- **idle → generating**: User clicks Generate with valid text (sourceText length 1000–10000)
- **generating → reviewing**: API returns successful CreateGenerationResponseDto
- **generating → error**: API fails (network, validation, AI service); user can retry
- **reviewing → saving**: User clicks "Save to Collection" with ≥1 accepted card
- **reviewing → idle**: User navigates away (confirm dialog) without saving
- **saving → idle**: Batch save succeeds, navigate to /flashcards
- **saving → error**: Batch save fails; user can retry or discard
- **error → idle**: User dismisses error (if not retryable) or toast auto-closes
- **error → generating**: User clicks retry button (retryCount incremented, exponential backoff applied)

---

## 7. API Integration

### 7.1 POST /generations

**Purpose**: Initiates AI flashcard generation from source text.

**When to Call**: User clicks "Generate Flashcards" button with valid sourceText (1000–10000 characters).

**Request Structure**:
```typescript
interface GenerationRequest {
  source_text: string; // 1000–10000 characters
}

// Implementation:
const request: CreateGenerationCommand = {
  source_text: sourceText.trim()
};
```

**Response Structure** (Success):
```typescript
interface GenerationResponse {
  generation_id: number;
  suggested_flashcards: Array<{
    front: string;
    back: string;
    source: 'ai-full';
  }>;
  generated_count: number;
}

// Maps to CreateGenerationResponseDto from types.ts
```

**Response Structure** (Error):
- **400 Bad Request**: source_text outside length range
  ```json
  {
    "error": "source_text must be between 1000 and 10000 characters"
  }
  ```
- **401 Unauthorized**: Invalid or expired JWT token
  ```json
  {
    "error": "Unauthorized"
  }
  ```
- **500 Internal Server Error**: AI service failure
  ```json
  {
    "error": "Failed to generate flashcards",
    "errorCode": "UNKNOWN_ERROR" | "NO_FLASHCARDS_GENERATED"
  }
  ```

**Implementation Steps**:
1. Validate sourceText on client: length >= 1000 && length <= 10000
2. Show loading spinner on Generate button
3. Make async POST request to `/api/generations`
4. Include JWT token in Authorization header (automatic via Astro context)
5. On success: 
   - Store generationId and suggestedFlashcards
   - Transform response to SuggestedFlashcardWithState array (add id, status: 'pending')
   - Transition state to reviewing
6. On error:
   - Create ErrorInfo with code and message
   - Transition state to error
   - Show toast with message and retry button
   - Implement exponential backoff: 2s, 5s, 15s (max 3 retries)

### 7.2 POST /flashcards/batch

**Purpose**: Creates multiple flashcards after user review and acceptance.

**When to Call**: User clicks "Save to Collection" button with ≥1 accepted card.

**Request Structure**:
```typescript
interface BatchSaveRequest {
  generation_id: number;
  flashcards: Array<{
    front: string;
    back: string;
    source: 'ai-full' | 'ai-edited'; // 'ai-full' if not edited, 'ai-edited' if edited
  }>;
}

// Implementation:
const request: CreateFlashcardsBatchCommand = {
  generation_id: generationId,
  flashcards: suggestedFlashcards
    .filter(card => card.status === 'accepted')
    .map(card => ({
      front: card.front,
      back: card.back,
      source: card.isEdited ? 'ai-edited' : 'ai-full'
    }))
};
```

**Response Structure** (Success):
```typescript
interface BatchSaveResponse {
  // Returns array of created FlashcardDto objects
  flashcards: Array<FlashcardDto>;
}
```

**Response Structure** (Error):
- **400 Bad Request**: Invalid request structure or validation fails
  ```json
  {
    "error": "Invalid flashcard data"
  }
  ```
- **401 Unauthorized**: Invalid or expired JWT token
  ```json
  {
    "error": "Unauthorized"
  }
  ```
- **500 Internal Server Error**: Database error
  ```json
  {
    "error": "Failed to save flashcards"
  }
  ```

**Implementation Steps**:
1. Validate ≥1 card accepted on client (disable Save button if not)
2. Show loading spinner on Save button
3. Make async POST request to `/api/flashcards/batch`
4. Include JWT token (automatic via Astro context)
5. On success:
   - Transition state to idle
   - Navigate to `/flashcards` (Astro native navigation)
   - Clear all state
6. On error:
   - Create ErrorInfo with code and message
   - Transition state to error
   - Show toast with message
   - Provide option to "Review Changes" or "Discard"
   - If review: return to reviewing state
   - If discard: reset to idle

### 7.3 API Call Implementation Pattern

```typescript
// In useGenerationViewState hook or component:

async function callGenerationAPI(sourceText: string) {
  setStatus('generating');
  
  try {
    const response = await fetch('/api/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_text: sourceText.trim() })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new GenerationError(
        response.status,
        errorData.error || 'Generation failed'
      );
    }
    
    const data: CreateGenerationResponseDto = await response.json();
    completeGeneration(data);
  } catch (error) {
    const errorInfo: ErrorInfo = {
      code: error instanceof GenerationError ? error.code : 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An error occurred',
      retryable: true
    };
    setGenerationError(errorInfo);
  }
}

async function callBatchSaveAPI(generationId: number, acceptedCards: SuggestedFlashcardWithState[]) {
  setStatus('saving');
  
  try {
    const request: CreateFlashcardsBatchCommand = {
      generation_id: generationId,
      flashcards: acceptedCards.map(card => ({
        front: card.front,
        back: card.back,
        source: card.source
      }))
    };
    
    const response = await fetch('/api/flashcards/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Save failed');
    }
    
    const data = await response.json();
    completeSave();
    // Navigate to /flashcards
    window.location.href = '/flashcards';
  } catch (error) {
    const errorInfo: ErrorInfo = {
      code: 'SAVE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to save flashcards',
      retryable: true
    };
    setSaveError(errorInfo);
  }
}
```

---

## 8. User Interactions

### 8.1 Text Input Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Paste/type text | Textarea | Text updates, CharacterCounter calculates (current, %, status), ProgressBar updates, GenerateButton enable/disable toggles |
| Text < 1000 chars | TextInputSection | Warning "Text must be at least 1,000 characters", button disabled |
| Text > 10000 chars | TextInputSection | Warning "Text cannot exceed 10,000 characters", button disabled, input still allowed (no max enforced) |
| Text 1000–10000 | TextInputSection | No warning, button enabled |

### 8.2 Generation Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Click Generate | GenerateButton | Loading spinner, button disabled, API call initiated, UI blocked |
| Generation succeeds | GenerationView | SuggestedFlashcardsReview appears, cards in 'pending' state, form behind becomes read-only |
| Generation fails (network) | GenerationView | Toast: "Network error. Check connection." + Retry button, exponential backoff (2s, 5s, 15s), sourceText preserved |
| Generation fails (AI) | GenerationView | Toast: "Generation failed. Try again." + Retry button (manual only after 3 attempts), sourceText preserved |
| User retries | GenerationView | Exponential backoff delay applied, loading state resumed, retry button disabled during retry |

### 8.3 Review Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Click Accept | FlashcardPreviewCard | Card status → 'accepted', card highlighted green, summary updates ("1 card to save"), Save button becomes enabled |
| Click Reject | FlashcardPreviewCard | Card removed from list, summary updates ("1 card rejected"), Save button state may change |
| Click Edit | FlashcardPreviewCard | FlashcardModal opens, front/back pre-filled, card index selected |
| Edit card in modal | FlashcardModal | Front/Back updated in real-time, CharacterCounters update (color-coded), Save button enables/disables based on validation |
| Save edit | FlashcardModal | Modal closes, card front/back updated, card status → 'accepted', card highlighted, summary updates |
| Cancel edit | FlashcardModal | Modal closes, card unchanged, card status remains |
| All cards rejected | SuggestedFlashcardsReview | List empty, message: "Accept at least one card to save", Save button disabled |

### 8.4 Batch Save Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Click Save to Collection | SuggestedFlashcardsReview | Loading spinner, button disabled, POST /flashcards/batch initiated, all components read-only |
| Save succeeds | GenerationView | State reset, navigate to `/flashcards` |
| Save fails | GenerationView | Toast: "Failed to save flashcards. Review changes?" with buttons "Review" and "Discard", sourceText/cards preserved for Review option |
| Click Review (after error) | GenerationView | Return to reviewing state, allow re-edit and re-save |
| Click Discard (after error) | GenerationView | Reset state to idle, clear sourceText and cards, return to generation form |

### 8.5 Navigation Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Click browser back button (during review) | ConfirmDialog | Dialog appears: "You have unsaved changes. Discard?" with "Keep Reviewing" / "Discard and Leave" buttons |
| Click "Discard and Leave" | ConfirmDialog | Dialog closes, browser navigates away, state reset |
| Click "Keep Reviewing" | ConfirmDialog | Dialog closes, return to review interface |
| beforeunload event (during review) | ConfirmDialog | Browser native confirm dialog: "You have unsaved changes..." if in reviewing state |

### 8.6 Info Box Workflow

| User Action | Component | Expected Behavior |
|---|---|---|
| Page load (new user) | InfoBox | Expanded by default (localStorage empty), shows instructions |
| Page load (returning user) | InfoBox | Collapsed if localStorage set, toggle icon available |
| Click toggle | InfoBox | Expanded/collapsed, state persisted to localStorage |

---

## 9. Conditions and Validation

### 9.1 Client-Side Validation

#### TextInputSection Validation

**Condition**: sourceText length
- **Valid**: 1000 ≤ length ≤ 10000
- **Invalid (below)**: length < 1000
- **Invalid (above)**: length > 10000

**Component Impact**:
- GenerateButton disabled when invalid
- Warning text displayed when invalid
- ProgressBar shows position in valid range
- CharacterCounter shows current/max with color-coded status

**User Feedback**:
- Text warning: "Text must be at least 1,000 characters" OR "Text cannot exceed 10,000 characters"
- Button state: disabled with visual styling

#### FlashcardModal Validation

**Condition**: Front field
- **Valid**: 1 ≤ length ≤ 200
- **Invalid (empty)**: length === 0 → error "Front side is required."
- **Invalid (too long)**: length > 200 → error "Front side cannot exceed 200 characters."

**Condition**: Back field
- **Valid**: 1 ≤ length ≤ 500
- **Invalid (empty)**: length === 0 → error "Back side is required."
- **Invalid (too long)**: length > 500 → error "Back side cannot exceed 500 characters."

**Component Impact**:
- CharacterCounter for each field shows color-coded status
- Error messages displayed below fields
- Save button disabled if any field invalid

**Character Counter Thresholds**:
- 0–70%: Green (valid, plenty of space)
- 70–90%: Yellow (warning, approaching limit)
- 90–100%: Red (danger, near/at limit)
- Yellow threshold: 160 chars (front), 400 chars (back)

#### SuggestedFlashcardsReview Validation

**Condition**: At least one card accepted
- **Valid**: acceptedCount ≥ 1
- **Invalid**: acceptedCount === 0

**Component Impact**:
- "Save to Collection" button disabled if invalid
- Message displayed: "Accept at least one card to save"

### 9.2 Server-Side Validation (Enforced at API Level)

These are already implemented in the backend services, but frontend should anticipate:

#### POST /generations Validation
- source_text must be 1000–10000 characters (enforced by Zod schema)
- User must be authenticated (JWT in header)
- User_id extracted from context.locals.user

#### POST /flashcards/batch Validation
- generation_id must exist and belong to authenticated user
- flashcards array must not be empty
- Each flashcard must have valid front, back, source fields
- front max 200 chars, back max 500 chars (database column constraints)
- User_id enforced via RLS

### 9.3 Verification at Component Level

**How to Verify TextInputSection Validation**:
```typescript
const isValid = sourceText.length >= 1000 && sourceText.length <= 10000;
const characterCounter = useCharacterCounter(sourceText, 1000, 10000);
// characterCounter.isValid === true enables button
```

**How to Verify FlashcardModal Validation**:
```typescript
const frontValid = front.length > 0 && front.length <= 200;
const backValid = back.length > 0 && back.length <= 500;
const canSave = frontValid && backValid && !hasErrors;
// canSave === true enables Save button
```

**How to Verify SuggestedFlashcardsReview Validation**:
```typescript
const acceptedCount = suggestedFlashcards.filter(c => c.status === 'accepted').length;
const canSave = acceptedCount > 0;
// canSave === true enables "Save to Collection" button
```

---

## 10. Error Handling

### 10.1 Error Categories and Handling Strategies

#### Network Errors

**Scenario**: User's internet connection lost or timeout during API call.

**Detection**: fetch() throws NetworkError, or response takes too long.

**Handling**:
1. Catch error, create ErrorInfo: `{ code: 'NETWORK_ERROR', message: 'Network error. Check your connection.', retryable: true }`
2. Show Toast with retry button
3. Implement exponential backoff: 2s, 5s, 15s
4. After 3rd attempt, show manual retry button only
5. Preserve sourceText and suggestedFlashcards for smart retry

**UI State**:
- Button disabled during retry wait
- Toast shows countdown: "Retrying in Xs..."
- User can manually retry immediately (resets backoff timer)

#### Generation Service Errors

**Scenario**: POST /generations fails with 400, 500, or other status codes.

**400 Bad Request**: source_text outside valid range
- This should not occur if client validation works, but handle gracefully
- Show: "Text length invalid. Must be 1,000–10,000 characters."
- Non-retryable (user must fix input)

**500 Internal Server Error**: AI service failed, logged in generation_error_logs
- Show: "Generation failed. The AI service had an error. Try again?"
- Retryable: Yes, up to 3 times with exponential backoff

**No Flashcards Generated**: AI returned empty array
- Show: "No flashcards generated from your text. Try different text?"
- Retryable: Yes, user can try with different content

**Implementation**:
```typescript
catch (error) {
  let errorInfo: ErrorInfo;
  if (error instanceof GenerationError) {
    errorInfo = {
      code: error.code,
      message: error.message,
      retryable: error.code !== 'VALIDATION_ERROR'
    };
  } else {
    errorInfo = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      retryable: true
    };
  }
  setGenerationError(errorInfo);
  showToast(errorInfo.message, 'error', { retryable: errorInfo.retryable });
}
```

#### Authentication Errors

**Scenario**: JWT token expired or invalid, 401 response.

**Detection**: response.status === 401.

**Handling**:
1. Show: "Session expired. Please log in again."
2. Non-retryable
3. Redirect to login page after 2 seconds
4. Clear local state

**Implementation**:
```typescript
if (response.status === 401) {
  showToast('Session expired. Redirecting to login...', 'error');
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
}
```

#### Batch Save Errors

**Scenario**: POST /flashcards/batch fails during save.

**400 Bad Request**: Invalid flashcard data
- Show: "Failed to save flashcards. Check your entries."
- Retryable: Yes (user can review and re-save)

**500 Internal Server Error**: Database error
- Show: "Failed to save flashcards to collection. Try again?"
- Retryable: Yes

**Handling**:
```typescript
catch (error) {
  const errorInfo: ErrorInfo = {
    code: 'SAVE_FAILED',
    message: 'Failed to save flashcards. Review changes or discard?',
    retryable: true
  };
  setSaveError(errorInfo);
  showToast(errorInfo.message, 'error', {
    retryable: true,
    actions: [
      { label: 'Review', onClick: () => setState('reviewing') },
      { label: 'Discard', onClick: () => resetState() }
    ]
  });
}
```

### 10.2 Error Display Strategy

**Toast Notifications**:
- Error toast at bottom-right, positioned fixed
- Auto-dismiss after 5 seconds (unless retryable, then indefinite until dismissed)
- Close button always available
- Retry button shown if retryable
- Multiple toasts stack vertically

**Inline Error Messages**:
- Character validation errors appear below textarea or input field
- Error text in red (Tailwind: text-red-600)
- Associated with input via aria-describedby

**Confirmation Dialogs**:
- Navigation warning during review state
- Batch save error with "Review" vs "Discard" options

### 10.3 Graceful Degradation

- If generation fails, user can remain on generation form and retry
- If batch save fails, user can review suggestions again before discarding
- If session expires, user redirected to login with clear message
- Character limits enforced at multiple levels (client validation, API validation, database constraints)

### 10.4 Error Recovery

**Retry Logic with Exponential Backoff**:
```typescript
const backoffDelays = [2000, 5000, 15000]; // ms
const calculateBackoffDelay = (retryCount: number) => {
  if (retryCount >= 3) return null; // No auto-retry after 3 attempts
  return backoffDelays[Math.min(retryCount, backoffDelays.length - 1)];
};

const retryGeneration = async () => {
  const delay = calculateBackoffDelay(retryCount);
  if (delay) {
    showToast(`Retrying in ${delay / 1000}s...`, 'info', { autoClose: false });
    setTimeout(() => startGeneration(), delay);
  } else {
    showToast('Failed after 3 attempts. Please try again manually.', 'error');
  }
};
```

**User-Initiated Retry**:
- Retry button in toast
- Resets retryCount to 0, applies standard exponential backoff
- Preserves sourceText and suggestedFlashcards across all retries

---

## 11. Implementation Steps

### Phase 1: Setup and Types (Day 1)

1. **Create type definitions** in `src/types.ts` (add if missing):
   - GenerationViewState
   - SuggestedFlashcardWithState
   - CharacterCounterModel
   - ProgressBarModel
   - ErrorInfo
   - Toast
   - FlashcardModalState
   - SuggestedFlashcardsReviewState
   - InfoBoxState

2. **Create custom hooks** in `src/components/hooks/`:
   - `useGenerationViewState.ts`: Main state machine hook
   - `useCharacterCounter.ts`: Character validation logic
   - `useFlashcardModal.ts`: Modal state and validation
   - `useToastNotifications.ts`: Toast queue management
   - `useConfirmDialog.ts`: Navigation confirmation

3. **Create utility functions** in `src/lib/`:
   - Exponential backoff calculator
   - Character validation helpers
   - API error parser

### Phase 2: Core Components (Days 2-3)

4. **Create TextInputSection component** (`src/components/TextInputSection.tsx`):
   - Textarea with onChange handler
   - Integrate useCharacterCounter hook
   - Render CharacterCounter and ProgressBar sub-components
   - Display warning text based on validation
   - Props: sourceText, isGenerating, onChangeText, onGenerateClick

5. **Create CharacterCounter component** (`src/components/CharacterCounter.tsx`):
   - Display current/max characters
   - Color-coded status (green/yellow/red)
   - Used in both TextInputSection and FlashcardModal
   - Props: current, max, threshold, label

6. **Create ProgressBar component** (`src/components/ProgressBar.tsx`):
   - Visual bar showing 1000–10000 range
   - Current position within range
   - Props: current, min, max

7. **Create GenerateButton component** (`src/components/GenerateButton.tsx`):
   - Button with loading spinner
   - Disabled state management
   - Props: isDisabled, isLoading, onClick

8. **Create InfoBox component** (`src/components/InfoBox.tsx`):
   - Collapsible container
   - Persist isExpanded to localStorage
   - Props: isExpanded, onToggle

### Phase 3: Review Components (Days 3-4)

9. **Create FlashcardPreviewCard component** (`src/components/FlashcardPreviewCard.tsx`):
   - Display front/back (truncated to ~100 chars)
   - Accept/Edit/Reject buttons
   - Visual state indicator
   - Props: card, cardIndex, onAccept, onEdit, onReject

10. **Create SuggestedFlashcardsReview component** (`src/components/SuggestedFlashcardsReview.tsx`):
    - Map FlashcardPreviewCard components
    - Display summary (X to save, Y rejected)
    - "Save to Collection" button (disabled if no accepted cards)
    - Props: cards, onAcceptCard, onRejectCard, onEditCard, onSaveToCollection, isSaving

11. **Create FlashcardModal component** (`src/components/FlashcardModal.tsx`):
    - Front input (max 200 chars)
    - Back input (max 500 chars)
    - CharacterCounter for each field
    - Validation error messages
    - Save/Cancel buttons
    - Use useFlashcardModal hook
    - Props: isOpen, isEditingMode, front, back, errors, onChangeFront, onChangeBack, onSave, onCancel

### Phase 4: Notifications and Dialogs (Day 4)

12. **Create Toast component** (`src/components/Toast.tsx`):
    - Display error/info/success messages
    - Auto-dismiss with configurable duration
    - Close and retry buttons
    - Props: id, type, message, retryable, onDismiss, onRetry

13. **Create ToastContainer component** (`src/components/ToastContainer.tsx`):
    - Render array of Toast components
    - Manage stacking and positioning
    - Props: toasts, onDismiss, onRetry

14. **Create ConfirmDialog component** (`src/components/ConfirmDialog.tsx`):
    - Modal with confirmation message
    - Confirm and Cancel buttons
    - Props: isOpen, onConfirm, onCancel

### Phase 5: Integration (Days 5-6)

15. **Create GenerationView page** (`src/pages/index.astro`):
    - Import Layout component
    - Add client:load directive to make interactive
    - Import all child components
    - Initialize useGenerationViewState hook
    - Render all components conditionally based on status
    - Handle navigation on successful save

16. **Create API endpoint** (`src/pages/api/generations.ts`) (if not already done):
    - POST handler
    - Call generateFlashcardsFromText service
    - Return CreateGenerationResponseDto
    - Handle errors and return appropriate status codes

17. **Create API endpoint** (`src/pages/api/flashcards/batch.ts`) (if not already done):
    - POST handler
    - Call createBatch service
    - Return created flashcards
    - Handle errors and return appropriate status codes

18. **Integrate API calls** in GenerationView:
    - Use fetch() for POST /generations
    - Implement exponential backoff for retries
    - Use fetch() for POST /flashcards/batch
    - Handle navigation on success (window.location.href = '/flashcards')

### Phase 6: Testing and Refinement (Days 6-7)

19. **Test state machine transitions**:
    - Verify all transitions: idle → generating → reviewing → saving → idle
    - Test error paths and recovery
    - Verify state preservation across retries

20. **Test validation**:
    - Text input: < 1000 chars, > 10000 chars, 1000–10000 chars
    - FlashcardModal: empty fields, length limits
    - SuggestedFlashcardsReview: no cards accepted

21. **Test error handling**:
    - Simulate network errors
    - Simulate API errors (400, 401, 500)
    - Verify exponential backoff timing
    - Verify toast display and retry actions

22. **Test accessibility**:
    - Aria-live regions for character counter updates
    - Aria-label on textarea
    - Modal focus management
    - Keyboard navigation (Tab, Enter, Escape)

23. **Test mobile UX**:
    - Textarea height on mobile
    - Button sizes and touch targets
    - Toast positioning on small screens
    - Modal overflow and scrolling

24. **Final Polish**:
    - Tailwind styling and responsive design
    - Loading state animations
    - Error message clarity
    - Documentation comments in code

---

## Implementation Notes

### Important Considerations

1. **sourceText Preservation**: Always preserve sourceText in state and localStorage to enable smart retries without data loss.

2. **Exponential Backoff**: Implement carefully to avoid user frustration. Provide manual retry button after automatic attempts exhaust.

3. **Card Editing State**: Track which card is being edited via `selectedCardIndex` to coordinate between SuggestedFlashcardsReview and FlashcardModal. Use `SuggestedFlashcardWithState.id` for stable identity across re-renders.

4. **Modal Reusability**: FlashcardModal can be used in multiple contexts (generation review, manual creation). Use `isEditingMode` prop to customize header and initial state.

5. **Character Counter Thresholds**: Use consistent threshold values across the app (70% warning, 90% error). Extract to constants for maintainability.

6. **Navigation Confirmation**: Integrate with browser's `beforeunload` event to catch both internal navigation (buttons, links) and external navigation (browser back/close).

7. **Accessibility**: Every interactive element must have clear labels. Use aria-live regions for dynamic content (character counters, errors). Ensure keyboard navigation is complete.

8. **Error Messages**: Keep messages user-friendly and actionable. Avoid technical jargon. Provide clear next steps (retry, review, discard).

9. **Loading States**: Show spinners and disable interactions during API calls. Provide visual feedback that something is happening.

10. **State Testing**: Thoroughly test the state machine before building UI. Use state diagrams and transition tables to ensure completeness.

### Dependencies

- React 19 (via Astro integration)
- TypeScript 5 (for type safety)
- Tailwind 4 (for styling)
- Shadcn/ui (for button, modal, dialog components if using them)
- @supabase/supabase-js (for authentication context, already in project)

### Files to Create/Modify

**Create**:
- `src/types.ts` (extend with new types)
- `src/components/TextInputSection.tsx`
- `src/components/CharacterCounter.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/GenerateButton.tsx`
- `src/components/InfoBox.tsx`
- `src/components/FlashcardPreviewCard.tsx`
- `src/components/SuggestedFlashcardsReview.tsx`
- `src/components/FlashcardModal.tsx`
- `src/components/Toast.tsx`
- `src/components/ToastContainer.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/components/hooks/useGenerationViewState.ts`
- `src/components/hooks/useCharacterCounter.ts`
- `src/components/hooks/useFlashcardModal.ts`
- `src/components/hooks/useToastNotifications.ts`
- `src/components/hooks/useConfirmDialog.ts`
- `src/lib/utils/errorHandler.ts`
- `src/lib/utils/backoffCalculator.ts`
- `src/pages/index.astro` (main Generation View page)

**Modify**:
- `src/pages/api/generations.ts` (ensure implementation matches spec)
- `src/pages/api/flashcards/batch.ts` (ensure implementation matches spec)

