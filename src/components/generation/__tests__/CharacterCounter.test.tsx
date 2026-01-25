import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CharacterCounter } from '../CharacterCounter';

describe('CharacterCounter', () => {
  describe('Character count display', () => {
    it('should display current and max character count', () => {
      render(<CharacterCounter current={500} max={1000} />);
      
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByText(/1,000/)).toBeInTheDocument();
      expect(screen.getByText(/characters/)).toBeInTheDocument();
    });

    it('should format numbers with locale separators', () => {
      render(<CharacterCounter current={1500} max={10000} />);
      
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
      expect(screen.getByText(/10,000/)).toBeInTheDocument();
    });

    it('should display optional label when provided', () => {
      render(<CharacterCounter current={500} max={1000} label="Front" />);
      
      expect(screen.getByText('Front:')).toBeInTheDocument();
    });

    it('should display minimum requirement when below min', () => {
      render(<CharacterCounter current={500} max={10000} min={1000} />);
      
      expect(screen.getByText(/min: 1,000/)).toBeInTheDocument();
    });
  });

  describe('Status indication', () => {
    it('should show valid status when within limits', () => {
      const { container } = render(
        <CharacterCounter current={500} max={1000} threshold={70} />
      );
      
      const countElement = container.querySelector('.text-green-600');
      expect(countElement).toBeInTheDocument();
      expect(countElement).toHaveTextContent('500');
    });

    it('should show warning status when approaching threshold', () => {
      const { container } = render(
        <CharacterCounter current={750} max={1000} threshold={70} />
      );
      
      const countElement = container.querySelector('.text-yellow-600');
      expect(countElement).toBeInTheDocument();
      expect(countElement).toHaveTextContent('750');
    });

    it('should show error status when exceeding max', () => {
      const { container } = render(
        <CharacterCounter current={1100} max={1000} />
      );
      
      const countElement = container.querySelector('.text-red-600');
      expect(countElement).toBeInTheDocument();
      expect(countElement).toHaveTextContent('1,100');
    });

    it('should show error status when below minimum', () => {
      const { container } = render(
        <CharacterCounter current={500} max={10000} min={1000} />
      );
      
      const countElement = container.querySelector('.text-red-600');
      expect(countElement).toBeInTheDocument();
      expect(countElement).toHaveTextContent('500');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero characters', () => {
      render(<CharacterCounter current={0} max={1000} />);
      
      expect(screen.getByText(/^0/)).toBeInTheDocument();
    });

    it('should handle exact max limit', () => {
      const { container } = render(
        <CharacterCounter current={1000} max={1000} threshold={70} />
      );
      
      // At 100%, which is >= 70% threshold, should show warning (yellow)
      const countElement = container.querySelector('.text-yellow-600');
      expect(countElement).toBeInTheDocument();
    });

    it('should handle exact min limit', () => {
      const { container } = render(
        <CharacterCounter current={1000} max={10000} min={1000} />
      );
      
      const countElement = container.querySelector('.text-green-600');
      expect(countElement).toBeInTheDocument();
    });

    it('should handle custom threshold', () => {
      const { container } = render(
        <CharacterCounter current={850} max={1000} threshold={80} />
      );
      
      // 850/1000 = 85%, which is above 80% threshold
      const countElement = container.querySelector('.text-yellow-600');
      expect(countElement).toBeInTheDocument();
    });
  });
});
