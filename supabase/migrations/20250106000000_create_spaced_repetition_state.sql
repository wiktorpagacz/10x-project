-- Create the spaced_repetition_state table
-- This table tracks the spaced repetition state for each flashcard per user
-- It follows the SM-2 (Supermemo 2) algorithm for optimal spaced repetition

CREATE TABLE spaced_repetition_state (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id BIGINT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interval INTEGER NOT NULL DEFAULT 1 COMMENT 'Number of days between reviews (SM-2)',
  ease_factor FLOAT NOT NULL DEFAULT 2.5 COMMENT 'Ease factor for the flashcard (SM-2)',
  repetitions INTEGER NOT NULL DEFAULT 0 COMMENT 'Number of times the flashcard has been reviewed',
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

-- Create indexes for optimal query performance
-- Index on user_id for filtering by user
CREATE INDEX idx_spaced_repetition_state_user_id 
  ON spaced_repetition_state(user_id);

-- Composite index on (user_id, next_review_date) for the main query
-- Used in GET /reviews to find all flashcards due for review today
CREATE INDEX idx_spaced_repetition_state_user_review_date 
  ON spaced_repetition_state(user_id, next_review_date);

-- Enable Row-Level Security for secure multi-tenancy
ALTER TABLE spaced_repetition_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own spaced repetition state
CREATE POLICY "Users can only view their own spaced repetition state"
  ON spaced_repetition_state FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own spaced repetition state
CREATE POLICY "Users can only insert their own spaced repetition state"
  ON spaced_repetition_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own spaced repetition state
CREATE POLICY "Users can only update their own spaced repetition state"
  ON spaced_repetition_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own spaced repetition state
CREATE POLICY "Users can only delete their own spaced repetition state"
  ON spaced_repetition_state FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_spaced_repetition_state_updated_at
BEFORE UPDATE ON spaced_repetition_state
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
