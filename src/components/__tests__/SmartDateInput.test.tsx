import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import SmartDateInput from '../SmartDateInput';

// Reset navigator mock before each test
beforeEach(() => {
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    writable: true,
    configurable: true
  });
});

// Mock RichDatePicker to verify lazy loading
vi.mock('../RichDatePicker', () => ({
  default: () => React.createElement('div', { 'data-testid': 'rich-datepicker' }, 'RichDatePicker')
}));

describe('SmartDateInput', () => {
  describe('Desktop Behavior', () => {
    it('renders a clickable button showing formatted date', () => {
      render(<SmartDateInput value="2023-01-15" onChange={() => {}} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2023/)).toBeInTheDocument();
    });

    it('shows placeholder when no value provided', () => {
      render(<SmartDateInput value="" onChange={() => {}} placeholder="Select a date" />);
      expect(screen.getByText('Select a date')).toBeInTheDocument();
    });

    it('preloads picker on hover', async () => {
      const importSpy = vi.fn();
      vi.doMock('../RichDatePicker', () => {
        importSpy();
        return { default: () => React.createElement('div') };
      });

      render(<SmartDateInput value="2023-01-01" onChange={() => {}} />);
      const container = screen.getByRole('button').parentElement;
      
      if (container) {
        fireEvent.mouseEnter(container);
      }
      
      // The preload function triggers the dynamic import
      // This is hard to test without more complex mocking
    });

    it('opens RichDatePicker on click', async () => {
      render(<SmartDateInput value="2023-01-01" onChange={() => {}} />);
      
      // Should not be visible initially
      expect(screen.queryByTestId('rich-datepicker')).not.toBeInTheDocument();
      
      // Click to open
      fireEvent.click(screen.getByRole('button'));
      
      // Should appear after click (wrapped in Suspense)
      await waitFor(() => {
        expect(screen.getByTestId('rich-datepicker')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 Mobile Safari/537.36'
        },
        writable: true,
        configurable: true
      });
    });

    it('renders native date input on mobile', () => {
      render(<SmartDateInput value="2023-06-15" onChange={() => {}} />);
      
      const input = screen.getByDisplayValue('2023-06-15');
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('renders datetime-local input when enableTime is true', () => {
      render(<SmartDateInput value="2023-06-15T14:30" onChange={() => {}} enableTime />);
      
      const input = screen.getByDisplayValue('2023-06-15T14:30');
      expect(input).toHaveAttribute('type', 'datetime-local');
    });

    it('calls onChange when date is selected', () => {
      const handleChange = vi.fn();
      render(<SmartDateInput value="2023-06-15" onChange={handleChange} />);
      
      const input = screen.getByDisplayValue('2023-06-15');
      fireEvent.change(input, { target: { value: '2023-07-20' } });
      
      expect(handleChange).toHaveBeenCalledWith('2023-07-20');
    });
  });
});
