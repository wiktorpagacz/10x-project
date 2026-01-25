import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  const defaultProps = {
    min: 1000,
    max: 10000,
  };

  describe("Visual representation", () => {
    it("should render progress bar with labels", () => {
      render(<ProgressBar {...defaultProps} current={5000} />);

      expect(screen.getByText("Min: 1,000")).toBeInTheDocument();
      expect(screen.getByText("Max: 10,000")).toBeInTheDocument();
      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("should have progressbar role with proper aria attributes", () => {
      render(<ProgressBar {...defaultProps} current={5000} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "5000");
      expect(progressbar).toHaveAttribute("aria-valuemin", "1000");
      expect(progressbar).toHaveAttribute("aria-valuemax", "10000");
    });

    it("should format numbers with locale separators", () => {
      render(<ProgressBar {...defaultProps} current={5500} />);

      expect(screen.getByText("5,500")).toBeInTheDocument();
    });
  });

  describe("Status: below minimum", () => {
    it("should show 0% progress when below minimum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={500} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "0%" });
    });

    it("should display error styling when below minimum", () => {
      render(<ProgressBar {...defaultProps} current={500} />);

      const currentValue = screen.getByText("500");
      expect(currentValue).toHaveClass("text-red-600");
    });

    it("should show error message when below minimum", () => {
      render(<ProgressBar {...defaultProps} current={500} />);

      expect(screen.getByText(/Text must be at least 1,000 characters/i)).toBeInTheDocument();
    });

    it("should have red progress bar when below minimum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={500} />);

      const progressBar = container.querySelector(".bg-red-500");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Status: in range", () => {
    it("should show correct percentage when at minimum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={1000} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "0%" });
    });

    it("should show 50% progress when halfway through range", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={5500} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "50%" });
    });

    it("should show 100% progress when at maximum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={10000} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "100%" });
    });

    it("should display success styling when in range", () => {
      render(<ProgressBar {...defaultProps} current={5000} />);

      const currentValue = screen.getByText("5,000");
      expect(currentValue).toHaveClass("text-green-600");
    });

    it("should not show error message when in range", () => {
      render(<ProgressBar {...defaultProps} current={5000} />);

      expect(screen.queryByText(/Text must be at least/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Text cannot exceed/i)).not.toBeInTheDocument();
    });

    it("should have green progress bar when in range", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={5000} />);

      const progressBar = container.querySelector(".bg-green-500");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Status: above maximum", () => {
    it("should show 100% progress when above maximum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={15000} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "100%" });
    });

    it("should display error styling when above maximum", () => {
      render(<ProgressBar {...defaultProps} current={15000} />);

      const currentValue = screen.getByText("15,000");
      expect(currentValue).toHaveClass("text-red-600");
    });

    it("should show error message when above maximum", () => {
      render(<ProgressBar {...defaultProps} current={15000} />);

      expect(screen.getByText(/Text cannot exceed 10,000 characters/i)).toBeInTheDocument();
    });

    it("should have red progress bar when above maximum", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={15000} />);

      const progressBar = container.querySelector(".bg-red-500");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle zero current value", () => {
      render(<ProgressBar {...defaultProps} current={0} />);

      expect(screen.getByText(/^0$/)).toBeInTheDocument();
    });

    it("should handle exact minimum boundary", () => {
      render(<ProgressBar {...defaultProps} current={1000} />);

      const currentValue = screen.getByText("1,000");
      expect(currentValue).toHaveClass("text-green-600");
    });

    it("should handle exact maximum boundary", () => {
      render(<ProgressBar {...defaultProps} current={10000} />);

      const currentValue = screen.getByText("10,000");
      expect(currentValue).toHaveClass("text-green-600");
    });

    it("should handle negative values", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={-100} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "0%" });
    });

    it("should handle very large values", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={999999} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "100%" });
    });
  });

  describe("Percentage calculation", () => {
    it("should calculate correct percentage at 25% through range", () => {
      // Range is 9000 (10000 - 1000), 25% of 9000 is 2250, so 1000 + 2250 = 3250
      const { container } = render(<ProgressBar {...defaultProps} current={3250} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "25%" });
    });

    it("should calculate correct percentage at 75% through range", () => {
      // Range is 9000, 75% of 9000 is 6750, so 1000 + 6750 = 7750
      const { container } = render(<ProgressBar {...defaultProps} current={7750} />);

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toHaveStyle({ width: "75%" });
    });
  });

  describe("Transitions", () => {
    it("should have transition classes for smooth animation", () => {
      const { container } = render(<ProgressBar {...defaultProps} current={5000} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass("transition-all");
    });
  });
});
