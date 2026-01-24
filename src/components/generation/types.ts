import type { SuggestedFlashcardDto } from '@/types';

// ################################################################# //
// ###################### VIEW STATE TYPES ######################### //
// ################################################################# //

/**
 * Represents the state machine status for the Generation View.
 */
export type GenerationViewStateType = 'idle' | 'generating' | 'reviewing' | 'saving' | 'error';

/**
 * Complete state of the Generation View, managing the state machine and all associated data.
 */
export interface GenerationViewState {
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

/**
 * Extends the API's SuggestedFlashcardDto with client-side state tracking.
 */
export interface SuggestedFlashcardWithState {
  // Card content
  front: string;
  back: string;
  source: 'ai-full' | 'ai-edited'; // Can change from ai-full to ai-edited when user edits
  
  // Client-side tracking
  id: string; // Unique client-side ID
  status: 'pending' | 'accepted' | 'rejected'; // Review status
  isEdited: boolean; // True if user edited this card
}

/**
 * Encapsulates error details for consistent error handling and display.
 */
export interface ErrorInfo {
  code: string; // Error code from API
  message: string; // User-friendly error message
  retryable: boolean; // Whether error allows retry
}

/**
 * Notification state for toast messages.
 */
export interface Toast {
  id: string; // Unique ID for toast
  type: 'error' | 'info' | 'success';
  message: string;
  retryable: boolean;
  autoClose: boolean;
  duration?: number; // ms before auto-close (default 5000)
  onRetry?: () => void; // Callback for retry button
}

// ################################################################# //
// ################### COMPONENT-SPECIFIC TYPES #################### //
// ################################################################# //

/**
 * Data model for character count feedback and validation.
 */
export interface CharacterCounterModel {
  current: number; // Current character count
  max: number; // Maximum allowed characters
  percentage: number; // (current / max) * 100
  status: 'valid' | 'warning' | 'error'; // Status based on percentage
  isValid: boolean; // true if current meets all requirements
}

/**
 * Extended character counter model for text input with min/max range.
 */
export interface TextInputCharacterCounterModel extends CharacterCounterModel {
  min: number; // Minimum required characters (1000)
}

/**
 * Data model for progress bar visualization.
 */
export interface ProgressBarModel {
  current: number; // Current character count
  min: number; // Minimum (1000)
  max: number; // Maximum (10000)
  percentage: number; // ((current - min) / (max - min)) * 100, clamped to 0-100
  inRange: boolean; // true if min <= current <= max
}

/**
 * State specific to the FlashcardModal component.
 */
export interface FlashcardModalState {
  isOpen: boolean;
  isEditingMode: boolean; // true for edit, false for create
  front: string;
  back: string;
  errors: {
    front?: string;
    back?: string;
  };
}

/**
 * Derived state for the review component.
 */
export interface SuggestedFlashcardsReviewState {
  cards: SuggestedFlashcardWithState[];
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  isSaving: boolean;
  error: ErrorInfo | null;
}

/**
 * State for collapsible info box.
 */
export interface InfoBoxState {
  isExpanded: boolean;
}

// ################################################################# //
// #################### COMPONENT PROPS TYPES ###################### //
// ################################################################# //

export interface TextInputSectionProps {
  sourceText: string;
  isGenerating: boolean;
  onChangeText: (text: string) => void;
  onGenerateClick: () => void;
}

export interface CharacterCounterProps {
  current: number;
  max: number;
  min?: number;
  threshold?: number; // Highlight threshold (default 70)
  label?: string; // Display label
}

export interface ProgressBarProps {
  current: number;
  min: number; // 1000
  max: number; // 10000
}

export interface InfoBoxProps {
  isExpanded: boolean;
  onToggle: (isExpanded: boolean) => void;
}

export interface GenerateButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export interface SuggestedFlashcardsReviewProps {
  cards: SuggestedFlashcardWithState[];
  onAcceptCard: (cardIndex: number) => void;
  onRejectCard: (cardIndex: number) => void;
  onEditCard: (cardIndex: number, front: string, back: string) => void;
  onAcceptAllCards: () => void;
  onRejectAllCards: () => void;
  onSaveToCollection: () => void;
  isSaving: boolean;
}

export interface FlashcardPreviewCardProps {
  card: SuggestedFlashcardWithState;
  cardIndex: number;
  onAccept: (index: number) => void;
  onEdit: (index: number, front: string, back: string) => void;
  onReject: (index: number) => void;
}

export interface FlashcardModalProps {
  isOpen: boolean;
  isEditingMode: boolean;
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

export interface ToastProps {
  id: string;
  type: 'error' | 'info' | 'success';
  message: string;
  retryable: boolean;
  onDismiss: (id: string) => void;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number; // ms, default 5000
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
