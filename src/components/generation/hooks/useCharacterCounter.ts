import { useMemo } from "react";
import type { CharacterCounterModel, TextInputCharacterCounterModel } from "../types";

/**
 * Reusable hook for character count calculation and validation.
 *
 * @param text - The text to count characters for
 * @param min - Minimum required characters (optional)
 * @param max - Maximum allowed characters
 * @param warningThreshold - Percentage at which to show warning (default 70)
 * @returns Character counter model with validation state
 */
export function useCharacterCounter(
  text: string,
  max: number,
  min?: number,
  warningThreshold = 70
): CharacterCounterModel | TextInputCharacterCounterModel {
  return useMemo(() => {
    const current = text.length;
    const percentage = max > 0 ? (current / max) * 100 : 0;

    // Determine status based on validation
    let status: "valid" | "warning" | "error" = "valid";
    let isValid = true;

    // Check max constraint
    if (current > max) {
      status = "error";
      isValid = false;
    }
    // Check min constraint if provided
    else if (min !== undefined && current < min) {
      status = "error";
      isValid = false;
    }
    // Check warning threshold
    else if (percentage >= warningThreshold) {
      status = "warning";
      // Still valid, just warning
    }

    const baseModel: CharacterCounterModel = {
      current,
      max,
      percentage,
      status,
      isValid,
    };

    // Return extended model if min is provided
    if (min !== undefined) {
      return {
        ...baseModel,
        min,
      } as TextInputCharacterCounterModel;
    }

    return baseModel;
  }, [text, min, max, warningThreshold]);
}
