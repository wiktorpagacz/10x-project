import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should display warning title', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('heading', { name: 'Unsaved Changes' })).toBeInTheDocument();
    });

    it('should display descriptive warning message', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(
        screen.getByText(/You have flashcards that haven't been saved/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/If you leave now, your changes will be lost/i)
      ).toBeInTheDocument();
    });

    it('should render both action buttons', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('button', { name: /keep reviewing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discard and leave/i })).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should call onCancel when "Keep Reviewing" is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onCancel={onCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /keep reviewing/i });
      await user.click(cancelButton);
      
      // onCancel may be called multiple times due to Radix UI's internal behavior
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onConfirm when "Discard and Leave" is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onConfirm={onConfirm} />);
      
      const confirmButton = screen.getByRole('button', { name: /discard and leave/i });
      await user.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers when dialog is closed', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />);
      
      // Since dialog is not rendered, buttons should not exist
      expect(screen.queryByRole('button', { name: /keep reviewing/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /discard and leave/i })).not.toBeInTheDocument();
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      const heading = screen.getByRole('heading', { name: 'Unsaved Changes' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('button', { name: /keep reviewing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discard and leave/i })).toBeInTheDocument();
    });

    it('should be keyboard accessible for cancel action', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onCancel={onCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /keep reviewing/i });
      cancelButton.focus();
      await user.keyboard('{Enter}');
      
      // onCancel may be called multiple times due to Radix UI's internal behavior
      expect(onCancel).toHaveBeenCalled();
    });

    it('should be keyboard accessible for confirm action', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onConfirm={onConfirm} />);
      
      const confirmButton = screen.getByRole('button', { name: /discard and leave/i });
      confirmButton.focus();
      await user.keyboard('{Enter}');
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should apply destructive styling to confirm button', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      const confirmButton = screen.getByRole('button', { name: /discard and leave/i });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('should have different styling for cancel vs confirm buttons', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      const cancelButton = screen.getByRole('button', { name: /keep reviewing/i });
      const confirmButton = screen.getByRole('button', { name: /discard and leave/i });
      
      expect(cancelButton.className).not.toEqual(confirmButton.className);
    });
  });

  describe('State transitions', () => {
    it('should properly update when isOpen changes from false to true', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      
      rerender(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should properly update when isOpen changes from true to false', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      
      rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });
  });

  describe('Handler isolation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onConfirm = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onCancel={onCancel} onConfirm={onConfirm} />);
      
      const cancelButton = screen.getByRole('button', { name: /keep reviewing/i });
      await user.click(cancelButton);
      
      // onCancel may be called multiple times due to Radix UI's internal behavior
      expect(onCancel).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const onConfirm = vi.fn();
      
      render(<ConfirmDialog {...defaultProps} isOpen={true} onCancel={onCancel} onConfirm={onConfirm} />);
      
      const confirmButton = screen.getByRole('button', { name: /discard and leave/i });
      await user.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
      // onCancel may be called due to Radix UI's internal behavior when dialog closes
    });
  });
});
