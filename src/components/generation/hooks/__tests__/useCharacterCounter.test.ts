import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCharacterCounter } from "../useCharacterCounter";

describe("useCharacterCounter", () => {
  const MAX_CHARS = 10000;
  const MIN_CHARS = 1000;
  const WARNING_THRESHOLD = 70;

  describe("Basic functionality", () => {
    it("should return current character count", () => {
      const text = "Hello, World!";
      const { result } = renderHook(() => useCharacterCounter(text, MAX_CHARS));

      expect(result.current.current).toBe(text.length);
    });

    it("should return max characters", () => {
      const { result } = renderHook(() => useCharacterCounter("test", MAX_CHARS));

      expect(result.current.max).toBe(MAX_CHARS);
    });

    it("should calculate percentage correctly", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(5000), MAX_CHARS));

      expect(result.current.percentage).toBe(50);
    });

    it("should return min characters when provided", () => {
      const { result } = renderHook(() => useCharacterCounter("test", MAX_CHARS, MIN_CHARS));

      if ("min" in result.current) {
        expect(result.current.min).toBe(MIN_CHARS);
      } else {
        throw new Error("Expected min to be in result");
      }
    });
  });

  describe("Validation: without min constraint", () => {
    it("should be valid when below warning threshold", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(5000), MAX_CHARS, undefined, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("valid");
      expect(result.current.isValid).toBe(true);
    });

    it("should show warning when at warning threshold", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(7000), MAX_CHARS, undefined, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("warning");
      expect(result.current.isValid).toBe(true);
    });

    it("should show warning when above warning threshold but below max", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(8000), MAX_CHARS, undefined, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("warning");
      expect(result.current.isValid).toBe(true);
    });

    it("should be invalid when exceeding max", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(10001), MAX_CHARS));

      expect(result.current.status).toBe("error");
      expect(result.current.isValid).toBe(false);
    });

    it("should be valid at exact max", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(MAX_CHARS), MAX_CHARS, undefined, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("warning"); // At 100%, which is >= 70%
      expect(result.current.isValid).toBe(true);
    });

    it("should be valid with empty string", () => {
      const { result } = renderHook(() => useCharacterCounter("", MAX_CHARS, undefined, WARNING_THRESHOLD));

      expect(result.current.status).toBe("valid");
      expect(result.current.isValid).toBe(true);
    });
  });

  describe("Validation: with min constraint", () => {
    it("should be invalid when below min", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(500), MAX_CHARS, MIN_CHARS));

      expect(result.current.status).toBe("error");
      expect(result.current.isValid).toBe(false);
    });

    it("should be valid at exact min", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(MIN_CHARS), MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD)
      );

      // 1000/10000 = 10%, which is < 70% threshold
      expect(result.current.status).toBe("valid");
      expect(result.current.isValid).toBe(true);
    });

    it("should be valid when between min and warning threshold", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(5000), MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("valid");
      expect(result.current.isValid).toBe(true);
    });

    it("should show warning when above threshold but below max", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(8000), MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("warning");
      expect(result.current.isValid).toBe(true);
    });

    it("should be invalid when exceeding max", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(10001), MAX_CHARS, MIN_CHARS));

      expect(result.current.status).toBe("error");
      expect(result.current.isValid).toBe(false);
    });

    it("should be valid at exact max", () => {
      const { result } = renderHook(() =>
        useCharacterCounter("a".repeat(MAX_CHARS), MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD)
      );

      expect(result.current.status).toBe("warning");
      expect(result.current.isValid).toBe(true);
    });

    it("should prioritize max error over min error", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(10001), MAX_CHARS, MIN_CHARS));

      // When both min and max are violated, max takes precedence
      expect(result.current.status).toBe("error");
      expect(result.current.isValid).toBe(false);
    });
  });

  describe("Custom warning threshold", () => {
    it("should use custom threshold of 80%", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(7500), MAX_CHARS, undefined, 80));

      // 7500/10000 = 75%, which is < 80%
      expect(result.current.status).toBe("valid");
    });

    it("should show warning at custom threshold of 80%", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(8000), MAX_CHARS, undefined, 80));

      // 8000/10000 = 80%, which is >= 80%
      expect(result.current.status).toBe("warning");
    });

    it("should use custom threshold of 50%", () => {
      const { result } = renderHook(() => useCharacterCounter("a".repeat(5000), MAX_CHARS, undefined, 50));

      // 5000/10000 = 50%, which is >= 50%
      expect(result.current.status).toBe("warning");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero characters", () => {
      const { result } = renderHook(() => useCharacterCounter("", MAX_CHARS));

      expect(result.current.current).toBe(0);
      expect(result.current.percentage).toBe(0);
      expect(result.current.isValid).toBe(true);
    });

    it("should handle zero max (edge case)", () => {
      const { result } = renderHook(() => useCharacterCounter("test", 0));

      expect(result.current.percentage).toBe(0);
    });

    it("should handle very long text", () => {
      const longText = "a".repeat(1000000);
      const { result } = renderHook(() => useCharacterCounter(longText, MAX_CHARS));

      expect(result.current.current).toBe(1000000);
      expect(result.current.isValid).toBe(false);
    });

    it("should handle unicode characters correctly", () => {
      const text = "😀😀😀😀😀"; // 5 emoji
      const { result } = renderHook(() => useCharacterCounter(text, MAX_CHARS));

      expect(result.current.current).toBe(text.length);
    });

    it("should handle whitespace and newlines", () => {
      const text = "Line 1\nLine 2\n\tTabbed";
      const { result } = renderHook(() => useCharacterCounter(text, MAX_CHARS));

      expect(result.current.current).toBe(text.length);
    });
  });

  describe("Memoization", () => {
    it("should return same object reference when inputs do not change", () => {
      const text = "Hello, World!";
      const { result, rerender } = renderHook(() => useCharacterCounter(text, MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it("should return new object when text changes", () => {
      const { result, rerender } = renderHook(
        ({ text }) => useCharacterCounter(text, MAX_CHARS, MIN_CHARS, WARNING_THRESHOLD),
        { initialProps: { text: "Hello" } }
      );

      const firstResult = result.current;

      rerender({ text: "Hello, World!" });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });

    it("should return new object when max changes", () => {
      const { result, rerender } = renderHook(
        ({ max }) => useCharacterCounter("test", max, MIN_CHARS, WARNING_THRESHOLD),
        { initialProps: { max: MAX_CHARS } }
      );

      const firstResult = result.current;

      rerender({ max: 5000 });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });
  });

  describe("Return type", () => {
    it("should return CharacterCounterModel when min is not provided", () => {
      const { result } = renderHook(() => useCharacterCounter("test", MAX_CHARS));

      expect(result.current).toHaveProperty("current");
      expect(result.current).toHaveProperty("max");
      expect(result.current).toHaveProperty("percentage");
      expect(result.current).toHaveProperty("status");
      expect(result.current).toHaveProperty("isValid");
      expect(result.current).not.toHaveProperty("min");
    });

    it("should return TextInputCharacterCounterModel when min is provided", () => {
      const { result } = renderHook(() => useCharacterCounter("test", MAX_CHARS, MIN_CHARS));

      expect(result.current).toHaveProperty("current");
      expect(result.current).toHaveProperty("max");
      expect(result.current).toHaveProperty("percentage");
      expect(result.current).toHaveProperty("status");
      expect(result.current).toHaveProperty("isValid");
      expect(result.current).toHaveProperty("min");
    });
  });
});
