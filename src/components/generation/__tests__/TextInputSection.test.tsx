import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TextInputSection } from '../TextInputSection';

describe('TextInputSection', () => {
  const defaultProps = {
    sourceText: '',
    isGenerating: false,
    onChangeText: vi.fn(),
    onGenerateClick: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render textarea with label', () => {
      render(<TextInputSection {...defaultProps} />);
      
      expect(screen.getByLabelText('Study Material')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste your study material here/i)).toBeInTheDocument();
    });

    it('should render character counter', () => {
      const validText = 'a'.repeat(5000);
      render(<TextInputSection {...defaultProps} sourceText={validText} />);
      
      expect(screen.getAllByText(/characters/i)[0]).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<TextInputSection {...defaultProps} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display current text in textarea', () => {
      const text = 'Sample study material';
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material') as HTMLTextAreaElement;
      expect(textarea.value).toBe(text);
    });
  });

  describe('Empty state', () => {
    it('should show informational message when empty', () => {
      render(<TextInputSection {...defaultProps} sourceText="" />);
      
      expect(screen.getByText(/Enter your study material to generate flashcards/i)).toBeInTheDocument();
    });

    it('should not show role="alert" validation warning when empty', () => {
      render(<TextInputSection {...defaultProps} sourceText="" />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Validation: below minimum', () => {
    it('should show error message when below 1000 characters', () => {
      const text = 'a'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      // Use getAllByText to get all matches and check the role="alert" one
      const alerts = screen.getAllByText(/Text must be at least 1,000 characters/i);
      const alertMessage = alerts.find(el => el.closest('[role="alert"]'));
      expect(alertMessage).toBeInTheDocument();
      expect(screen.getByText(/You need 500 more characters/i)).toBeInTheDocument();
    });

    it('should apply error styling to textarea when below minimum', () => {
      const text = 'a'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveClass('border-red-300');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should show warning icon in error message', () => {
      const text = 'a'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      expect(screen.getByText('⚠')).toBeInTheDocument();
    });
  });

  describe('Validation: above maximum', () => {
    it('should show error message when above 10000 characters', () => {
      const text = 'a'.repeat(10500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      // Use getAllByText to get all matches and check the role="alert" one
      const alerts = screen.getAllByText(/Text cannot exceed 10,000 characters/i);
      const alertMessage = alerts.find(el => el.closest('[role="alert"]'));
      expect(alertMessage).toBeInTheDocument();
      expect(screen.getByText(/Please remove 500 characters/i)).toBeInTheDocument();
    });

    it('should apply error styling to textarea when above maximum', () => {
      const text = 'a'.repeat(10500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveClass('border-red-300');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Validation: within valid range', () => {
    it('should not show error when at minimum (1000 chars)', () => {
      const text = 'a'.repeat(1000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      expect(screen.queryByText(/Text must be at least/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not show error when at maximum (10000 chars)', () => {
      const text = 'a'.repeat(10000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      expect(screen.queryByText(/Text cannot exceed/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not show error when in middle of range', () => {
      const text = 'a'.repeat(5000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should apply valid styling to textarea when in range', () => {
      const text = 'a'.repeat(5000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveClass('border-neutral-300');
      expect(textarea).not.toHaveClass('border-red-300');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('User interactions', () => {
    it('should call onChangeText when user types', async () => {
      const user = userEvent.setup();
      const onChangeText = vi.fn();
      
      render(<TextInputSection {...defaultProps} onChangeText={onChangeText} />);
      
      const textarea = screen.getByLabelText('Study Material');
      await user.type(textarea, 'Hello');
      
      expect(onChangeText).toHaveBeenCalled();
      // Should be called for each character
      expect(onChangeText.mock.calls[0][0]).toContain('H');
    });

    it('should call onChangeText with accumulated text', async () => {
      const user = userEvent.setup();
      const onChangeText = vi.fn();
      
      render(<TextInputSection {...defaultProps} onChangeText={onChangeText} />);
      
      const textarea = screen.getByLabelText('Study Material');
      await user.type(textarea, 'Test');
      
      // Check that the calls contain progressively more text
      expect(onChangeText).toHaveBeenCalled();
      expect(onChangeText.mock.calls.length).toBeGreaterThan(0);
    });

    it('should allow pasting text', async () => {
      const user = userEvent.setup();
      const onChangeText = vi.fn();
      
      render(<TextInputSection {...defaultProps} onChangeText={onChangeText} />);
      
      const textarea = screen.getByLabelText('Study Material');
      await user.click(textarea);
      await user.paste('Pasted content');
      
      expect(onChangeText).toHaveBeenCalled();
    });
  });

  describe('Disabled state', () => {
    it('should disable textarea when isGenerating is true', () => {
      render(<TextInputSection {...defaultProps} isGenerating={true} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toBeDisabled();
    });

    it('should not disable textarea when isGenerating is false', () => {
      render(<TextInputSection {...defaultProps} isGenerating={false} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).not.toBeDisabled();
    });

    it('should prevent typing when disabled', async () => {
      const user = userEvent.setup();
      const onChangeText = vi.fn();
      
      render(<TextInputSection {...defaultProps} isGenerating={true} onChangeText={onChangeText} />);
      
      const textarea = screen.getByLabelText('Study Material');
      await user.type(textarea, 'Should not work');
      
      expect(onChangeText).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<TextInputSection {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toBeInTheDocument();
    });

    it('should have aria-describedby linking to counter and progress', () => {
      render(<TextInputSection {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Study Material');
      const ariaDescribedby = textarea.getAttribute('aria-describedby');
      
      expect(ariaDescribedby).toContain('counter');
      expect(ariaDescribedby).toContain('progress');
    });

    it('should mark textarea as invalid when validation fails', () => {
      const text = 'a'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should mark textarea as valid when validation passes', () => {
      const text = 'a'.repeat(5000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have role="alert" for error messages', () => {
      const text = 'a'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Character counter integration', () => {
    it('should display correct character count', () => {
      const text = 'a'.repeat(2500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      // Use getAllByText since "2,500" appears in both counter and progress bar
      const matches = screen.getAllByText(/2,500/);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should update character count when text changes', () => {
      const text1 = 'a'.repeat(1000);
      const text2 = 'a'.repeat(5000);
      const { rerender } = render(<TextInputSection {...defaultProps} sourceText={text1} />);
      
      // Use getAllByText since "1,000" appears multiple times
      expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0);
      
      rerender(<TextInputSection {...defaultProps} sourceText={text2} />);
      
      // Use getAllByText since "5,000" appears in both counter and progress bar
      expect(screen.getAllByText(/5,000/).length).toBeGreaterThan(0);
    });
  });

  describe('Progress bar integration', () => {
    it('should show progress bar with correct values', () => {
      const text = 'a'.repeat(5000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '5000');
      expect(progressbar).toHaveAttribute('aria-valuemin', '1000');
      expect(progressbar).toHaveAttribute('aria-valuemax', '10000');
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace-only text', () => {
      const text = '   \n\n  ';
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      // Should show empty message since trim().length === 0
      expect(screen.getByText(/Enter your study material/i)).toBeInTheDocument();
    });

    it('should show error for very long text', () => {
      const text = 'a'.repeat(50000);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      // Use getAllByText to get all matches and check the role="alert" one
      const alerts = screen.getAllByText(/Text cannot exceed/i);
      const alertMessage = alerts.find(el => el.closest('[role="alert"]'));
      expect(alertMessage).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const text = '😀'.repeat(500);
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material') as HTMLTextAreaElement;
      expect(textarea.value).toBe(text);
    });

    it('should handle text with newlines', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      render(<TextInputSection {...defaultProps} sourceText={text} />);
      
      const textarea = screen.getByLabelText('Study Material') as HTMLTextAreaElement;
      expect(textarea.value).toBe(text);
    });
  });

  describe('Styling', () => {
    it('should have proper min-height for textarea', () => {
      render(<TextInputSection {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveClass('min-h-[300px]');
    });

    it('should allow vertical resizing', () => {
      render(<TextInputSection {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Study Material');
      expect(textarea).toHaveClass('resize-y');
    });

    it('should have proper spacing between elements', () => {
      const { container } = render(<TextInputSection {...defaultProps} />);
      
      const outerDiv = container.querySelector('.space-y-4');
      expect(outerDiv).toBeInTheDocument();
    });
  });
});
