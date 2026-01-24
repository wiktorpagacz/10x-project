# Generation View Components

Complete implementation of the AI-powered flashcard generation workflow.

## Overview

The Generation View is the primary entry point for authenticated users. It manages a state machine that guides users through: text input validation → AI generation → flashcard review/curation → batch saving to collection.

## Architecture

### State Machine

```
idle → generating → reviewing → saving → idle
  ↑       ↓           ↓           ↓
  └─────error ←───────┴───────────┘
```

### Component Hierarchy

```
GenerationView (Main Component)
├── ToastContainer (Sonner-based notifications)
├── InfoBox (Collapsible instructions)
├── TextInputSection
│   ├── Textarea (1000-10000 chars)
│   ├── CharacterCounter
│   └── ProgressBar
├── GenerateButton (CTA with loading state)
├── SuggestedFlashcardsReview (Conditional: reviewing state)
│   ├── FlashcardPreviewCard × N
│   │   ├── Front/Back preview (truncated to 100 chars)
│   │   └── Action buttons (Accept/Edit/Reject)
│   └── Save to Collection button
├── FlashcardModal (Conditional: editing)
│   ├── Front field + CharacterCounter (max 200)
│   ├── Back field + CharacterCounter (max 500)
│   └── Save/Cancel buttons
└── ConfirmDialog (Conditional: navigation warning)
```

## Key Features

### 1. Text Input & Validation
- **Character Range**: 1,000 - 10,000 characters
- **Real-time Feedback**: Character counter with color coding
- **Progress Bar**: Visual indicator of position within range
- **localStorage Persistence**: Source text saved for recovery

### 2. AI Generation
- **API Integration**: POST /api/generations
- **Error Handling**: Network errors, AI failures, validation errors
- **Retry Logic**: Exponential backoff (2s, 4s, 8s, max 15s)
- **Loading States**: Button spinner, disabled interactions

### 3. Flashcard Review
- **Card Actions**: Accept, Edit, Reject
- **Visual States**: Pending (neutral), Accepted (green), Rejected (hidden)
- **Batch Operations**: Review multiple cards before saving
- **Edit Modal**: Full edit capability with validation

### 4. Batch Save
- **API Integration**: POST /api/flashcards/batch
- **Validation**: At least 1 card must be accepted
- **Source Tracking**: 'ai-full' vs 'ai-edited'
- **Navigation**: Auto-redirect to /flashcards on success

### 5. Error Handling
- **Toast Notifications**: User-friendly error messages
- **Retry Actions**: One-click retry for retryable errors
- **Session Expiry**: Auto-redirect to login on 401
- **Network Detection**: Specific messaging for connectivity issues

### 6. Navigation Protection
- **Browser Events**: Integrates with beforeunload
- **Confirm Dialog**: Warns before leaving with unsaved changes
- **State Tracking**: Only blocks during review state

## Usage

### In Astro Page

```astro
---
import Layout from "@/layouts/Layout.astro";
import { GenerationView } from "@/components/generation";

const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/login');
}
---

<Layout title="Generate Flashcards">
  <GenerationView client:load />
</Layout>
```

### Direct Import

```tsx
import { GenerationView } from '@/components/generation';

// In your React component
<GenerationView />
```

## API Requirements

### Backend Architecture

The frontend **does not duplicate backend logic**. It simply calls REST API endpoints:

**Backend Services (already implemented):**
- `generation.service.ts` - Orchestrates AI generation, DB operations, error logging
- `flashcard.service.ts` - Handles flashcard CRUD operations
- `open-router.service.ts` - AI service integration

**Frontend Responsibility:**
- Call API endpoints with proper request bodies
- Handle HTTP responses and errors
- Manage UI state based on API responses
- Display user-friendly error messages

### Endpoints

1. **POST /api/generations**
   - **Request Body**: `CreateGenerationCommand`
     ```typescript
     { source_text: string } // 1000-10000 characters
     ```
   - **Success Response** (200): `CreateGenerationResponseDto`
     ```typescript
     {
       generation_id: number,
       suggested_flashcards: SuggestedFlashcardDto[],
       generated_count: number
     }
     ```
   - **Error Responses**:
     - `400` - Validation error (source_text out of range)
     - `401` - Unauthorized (session expired)
     - `500` - Generation failed (AI service error, logged to DB)

2. **POST /api/flashcards/batch**
   - **Request Body**: `CreateFlashcardsBatchCommand`
     ```typescript
     {
       generation_id: number,
       flashcards: Array<{
         front: string,
         back: string,
         source: 'ai-full' | 'ai-edited'
       }>
     }
     ```
   - **Success Response** (200/201): Success (no body required)
   - **Error Responses**:
     - `400` - Invalid flashcard data
     - `401` - Unauthorized (session expired)
     - `404` - Generation not found
     - `500` - Database error

### Authentication

- User must be authenticated via Astro middleware
- JWT token automatically included in fetch requests (cookie-based)
- 401 responses trigger redirect to /login
- User ID extracted from `context.locals.user` on backend

## Components

### Exported Components

- `GenerationView` - Main orchestrator component
- `InfoBox` - Collapsible instructions
- `TextInputSection` - Text input with validation
- `GenerateButton` - Primary CTA
- `CharacterCounter` - Character count display
- `ProgressBar` - Visual range indicator
- `FlashcardPreviewCard` - Individual card preview
- `SuggestedFlashcardsReview` - Review container
- `FlashcardModal` - Create/edit modal
- `ConfirmDialog` - Navigation warning
- `ToastContainer` - Toast notification system

### Exported Hooks

- `useGenerationViewState` - Main state management
- `useCharacterCounter` - Character validation
- `useFlashcardModal` - Modal state management
- `useToastNotifications` - Toast queue management
- `useConfirmDialog` - Navigation blocking
- `useInfoBoxInitialState` - InfoBox persistence

### API Integration

Frontend uses **native fetch API** to call backend endpoints:

```typescript
// Generation
const response = await fetch('/api/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ source_text: text }),
});

// Batch Save
const response = await fetch('/api/flashcards/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ generation_id, flashcards }),
});
```

**No custom API wrapper** - keeps frontend simple and aligned with web standards.

## Styling

All components use:
- **Tailwind CSS 4** for styling
- **Shadcn/ui** components (Dialog, AlertDialog, Button, etc.)
- **Dark mode** support throughout
- **Responsive design** with mobile-first approach
- **Lucide React** icons

## Accessibility

- Full ARIA support (labels, descriptions, roles)
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader friendly
- Error announcements via `role="alert"`
- Focus management in modals

## Performance

- `useCallback` for stable function references
- `useMemo` for expensive calculations
- Immutable state updates
- Minimal re-renders
- localStorage caching

## Error Scenarios

### Network Errors
- Message: "Network error. Check your connection."
- Retry: Yes (exponential backoff)
- Action: Show toast with retry button

### AI Service Failures
- Message: "Failed to generate flashcards. Try again."
- Retry: Yes (up to 3 attempts)
- Action: Show toast with retry button

### Validation Errors
- Message: "Text must be between 1,000 and 10,000 characters"
- Retry: No (user must fix input)
- Action: Show error message, disable button

### Session Expiry
- Message: "Your session has expired. Please log in again."
- Retry: No
- Action: Redirect to /login after 2s

### No Flashcards Generated
- Message: "No flashcards generated. Try different text?"
- Retry: Yes
- Action: Show toast with retry button

## State Persistence

- **Source Text**: Saved to localStorage on every change
- **InfoBox State**: Expanded/collapsed preference saved
- **Recovery**: Text recoverable after page refresh
- **Cleanup**: localStorage cleared on successful save

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- localStorage support required
- fetch API required

## Future Enhancements

- [ ] Undo/redo for card edits
- [ ] Bulk accept/reject actions
- [ ] Save draft generations
- [ ] Export flashcards before saving
- [ ] Advanced filtering options
- [ ] Card preview with markdown support
- [ ] Keyboard shortcuts for review
- [ ] Mobile-optimized swipe gestures

## Testing Checklist

- [x] Text input validation (min/max)
- [x] Character counter color coding
- [x] Progress bar visualization
- [x] Generate button disabled states
- [x] API error handling
- [x] Retry with exponential backoff
- [x] Card accept/reject/edit
- [x] Modal validation
- [x] Batch save with at least 1 card
- [x] Navigation blocking during review
- [x] Toast notifications
- [x] Session expiry redirect
- [x] localStorage persistence
- [x] Dark mode support
- [x] Responsive layout
- [x] Keyboard navigation
- [x] Screen reader support

## License

Part of the 10xCards project.
