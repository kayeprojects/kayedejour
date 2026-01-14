import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock RichDatePicker before importing SmartDateInput
vi.mock('../RichDatePicker', () => ({
  default: () => React.createElement('div', { 'data-testid': 'rich-datepicker' }, 'RichDatePicker')
}));

// Import after mocking
import SmartDateInput from '../SmartDateInput';

describe('SmartDateInput', () => {
  describe('Desktop Behavior', () => {
    beforeEach(() => {
      // Reset to desktop user agent
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    });

    it('renders a clickable button showing formatted date', () => {
      render(<SmartDateInput value="2023-01-15" onChange={() => {}} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows placeholder when no value provided', () => {
      render(<SmartDateInput value="" onChange={() => {}} placeholder="Select a date" />);
      expect(screen.getByText('Select a date')).toBeInTheDocument();
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      // Set mobile user agent
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 Mobile Safari/537.36'
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
