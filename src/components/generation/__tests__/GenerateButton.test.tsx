import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GenerateButton } from '../GenerateButton';

describe('GenerateButton', () => {
  describe('Rendering', () => {
    it('should render with default "Generate Flashcards" text', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /generate flashcards/i })).toBeInTheDocument();
      expect(screen.getByText('Generate Flashcards')).toBeInTheDocument();
    });

    it('should render Sparkles icon when not loading', () => {
      const { container } = render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      // Sparkles icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render loading state with spinner', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={true}
          onClick={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /generating flashcards/i })).toBeInTheDocument();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should render Loader2 icon with spin animation when loading', () => {
      const { container } = render(
        <GenerateButton
          isDisabled={false}
          isLoading={true}
          onClick={vi.fn()}
        />
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should be disabled when isDisabled is true', () => {
      render(
        <GenerateButton
          isDisabled={true}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when isLoading is true', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={true}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when both isDisabled and isLoading are true', () => {
      render(
        <GenerateButton
          isDisabled={true}
          isLoading={true}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not be disabled when both flags are false', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('User interactions', () => {
    it('should call onClick when clicked and enabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={handleClick}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <GenerateButton
          isDisabled={true}
          isLoading={false}
          onClick={handleClick}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={true}
          onClick={handleClick}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label when not loading', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button', { name: /generate flashcards/i });
      expect(button).toHaveAttribute('aria-label', 'Generate flashcards');
    });

    it('should have proper aria-label when loading', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={true}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button', { name: /generating flashcards/i });
      expect(button).toHaveAttribute('aria-label', 'Generating flashcards...');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={handleClick}
        />
      );
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should have proper sizing classes', () => {
      render(
        <GenerateButton
          isDisabled={false}
          isLoading={false}
          onClick={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full', 'sm:w-auto', 'min-w-[200px]');
    });
  });
});
