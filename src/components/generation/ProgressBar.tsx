import type { ProgressBarProps } from "./types";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Visual component displaying the valid character range (1000–10000) as a horizontal progress bar.
 * Shows current position within range and indicates if input is within, below, or above the valid range.
 */
export function ProgressBar({ current, min, max }: ProgressBarProps) {
  const { percentage, inRange, status } = useMemo(() => {
    const range = max - min;
    let percentage = 0;
    let status: "below" | "in-range" | "above" = "below";

    if (current < min) {
      status = "below";
      percentage = 0;
    } else if (current > max) {
      status = "above";
      percentage = 100;
    } else {
      status = "in-range";
      percentage = ((current - min) / range) * 100;
    }

    return {
      percentage: Math.max(0, Math.min(100, percentage)),
      inRange: current >= min && current <= max,
      status,
    };
  }, [current, min, max]);

  // Color based on status
  const barColorClass = {
    below: "bg-red-500",
    "in-range": "bg-green-500",
    above: "bg-red-500",
  }[status];

  const containerColorClass = {
    below: "bg-red-100 dark:bg-red-900/20",
    "in-range": "bg-green-100 dark:bg-green-900/20",
    above: "bg-red-100 dark:bg-red-900/20",
  }[status];

  return (
    <div className="w-full space-y-2">
      {/* Progress bar */}
      <div className={cn("relative h-2 w-full rounded-full overflow-hidden", containerColorClass)}>
        <div
          className={cn("h-full transition-all duration-300", barColorClass)}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={min}
          aria-valuemax={max}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <span>Min: {min.toLocaleString()}</span>
        <span
          className={cn(
            "font-medium",
            inRange ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {current.toLocaleString()}
        </span>
        <span>Max: {max.toLocaleString()}</span>
      </div>

      {/* Status message */}
      {!inRange && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {status === "below"
            ? `Text must be at least ${min.toLocaleString()} characters`
            : `Text cannot exceed ${max.toLocaleString()} characters`}
        </p>
      )}
    </div>
  );
}
