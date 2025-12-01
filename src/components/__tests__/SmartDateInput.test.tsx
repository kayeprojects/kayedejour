import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import SmartDateInput from '../SmartDateInput';

// Mock RichDatePicker to verify lazy loading
vi.mock('../RichDatePicker', () => ({
  default: () => <div data-testid="rich-datepicker">RichDatePicker</div>
}));

describe('SmartDateInput', () => {
  it('renders native input on mobile', () => {
    // Mock user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36',
      configurable: true
    });

    render(<SmartDateInput value="2023-01-01" onChange={() => {}} />);
    const input = screen.getByDisplayValue('2023-01-01');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('date');
  });

  it('renders trigger button on desktop', () => {
    // Mock user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true
    });

    render(<SmartDateInput value="2023-01-01" onChange={() => {}} />);
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
  });

  it('lazy loads RichDatePicker on click', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true
    });

    render(<SmartDateInput value="2023-01-01" onChange={() => {}} />);
    
    // Should not be in document initially
    expect(screen.queryByTestId('rich-datepicker')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByRole('button'));

    // Should appear (wrapped in Suspense, so might need wait)
    expect(await screen.findByTestId('rich-datepicker')).toBeInTheDocument();
  });
});
