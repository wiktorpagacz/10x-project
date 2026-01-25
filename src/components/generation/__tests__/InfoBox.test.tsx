import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { InfoBox } from "../InfoBox";

describe("InfoBox", () => {
  const defaultProps = {
    isExpanded: false,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the header with icon and title", () => {
      render(<InfoBox {...defaultProps} />);

      expect(screen.getByText("How to Generate Flashcards")).toBeInTheDocument();
    });

    it("should render as a collapsible component", () => {
      render(<InfoBox {...defaultProps} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeInTheDocument();
    });

    it("should show content when expanded", () => {
      render(<InfoBox {...defaultProps} isExpanded={true} />);

      expect(screen.getByText(/Paste or type your study material/i)).toBeInTheDocument();
    });

    it("should not show content when collapsed", () => {
      render(<InfoBox {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText(/Paste or type your study material/i)).not.toBeInTheDocument();
    });
  });

  describe("Chevron icon rotation", () => {
    it("should show chevron pointing down when collapsed", () => {
      const { container } = render(<InfoBox {...defaultProps} isExpanded={false} />);

      const chevron = container.querySelector(".lucide-chevron-down");
      expect(chevron).toBeInTheDocument();
      expect(chevron).not.toHaveClass("rotate-180");
    });

    it("should rotate chevron when expanded", () => {
      const { container } = render(<InfoBox {...defaultProps} isExpanded={true} />);

      const chevron = container.querySelector(".lucide-chevron-down");
      expect(chevron).toHaveClass("rotate-180");
    });
  });

  describe("User interactions", () => {
    it("should call onToggle when header is clicked", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<InfoBox {...defaultProps} onToggle={onToggle} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("should toggle between expanded and collapsed states", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      const { rerender } = render(<InfoBox {...defaultProps} isExpanded={false} onToggle={onToggle} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      expect(onToggle).toHaveBeenCalledWith(true);

      // Simulate parent updating state
      rerender(<InfoBox {...defaultProps} isExpanded={true} onToggle={onToggle} />);

      await user.click(trigger);
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();

      render(<InfoBox {...defaultProps} onToggle={onToggle} />);

      const trigger = screen.getByRole("button");
      trigger.focus();
      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe("LocalStorage persistence", () => {
    it("should persist expanded state to localStorage", () => {
      render(<InfoBox {...defaultProps} isExpanded={true} />);

      expect(localStorage.getItem("generation-view-infobox-expanded")).toBe("true");
    });

    it("should persist collapsed state to localStorage", () => {
      render(<InfoBox {...defaultProps} isExpanded={false} />);

      expect(localStorage.getItem("generation-view-infobox-expanded")).toBe("false");
    });

    it("should update localStorage when state changes", () => {
      const { rerender } = render(<InfoBox {...defaultProps} isExpanded={false} />);

      expect(localStorage.getItem("generation-view-infobox-expanded")).toBe("false");

      rerender(<InfoBox {...defaultProps} isExpanded={true} />);

      expect(localStorage.getItem("generation-view-infobox-expanded")).toBe("true");
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = Storage.prototype.setItem;
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw error
      expect(() => {
        render(<InfoBox {...defaultProps} isExpanded={true} />);
      }).not.toThrow();

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Styling", () => {
    it("should have proper color scheme for info box", () => {
      render(<InfoBox {...defaultProps} />);

      const collapsible = document.querySelector(".border-blue-200");
      expect(collapsible).toBeInTheDocument();
    });

    it("should have hover effect on trigger", () => {
      render(<InfoBox {...defaultProps} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("hover:bg-blue-100");
    });

    it("should have transition for chevron rotation", () => {
      const { container } = render(<InfoBox {...defaultProps} />);

      const chevron = container.querySelector(".lucide-chevron-down");
      expect(chevron).toHaveClass("transition-transform");
    });
  });

  describe("Accessibility", () => {
    it("should have proper button role for trigger", () => {
      render(<InfoBox {...defaultProps} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeInTheDocument();
    });

    it("should have descriptive heading", () => {
      render(<InfoBox {...defaultProps} />);

      expect(screen.getByRole("heading", { name: /how to generate flashcards/i })).toBeInTheDocument();
    });

    it("should properly announce expanded/collapsed state to screen readers", () => {
      render(<InfoBox {...defaultProps} isExpanded={false} />);

      // Radix UI Collapsible should handle aria-expanded
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("data-state", "closed");
    });
  });

  describe("Content", () => {
    it("should display instructional text when expanded", () => {
      render(<InfoBox {...defaultProps} isExpanded={true} />);

      expect(screen.getByText(/Paste or type your study material/i)).toBeInTheDocument();
      expect(screen.getByText(/Our AI will analyze your content/i)).toBeInTheDocument();
    });

    it("should display character limit information when expanded", () => {
      render(<InfoBox {...defaultProps} isExpanded={true} />);

      // Check for both values separately since they are in different elements
      expect(screen.getByText(/1,000 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/10,000 characters/i)).toBeInTheDocument();
    });
  });
});
