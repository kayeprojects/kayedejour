import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

const mockFolders = [
  { id: '1', name: 'Work', user_id: 'user1', created_at: '2023-01-01', is_dirty: 0, is_deleted: 0 },
];

const defaultProps = {
  activeFolder: 'All Notes',
  setActiveFolder: vi.fn(),
  folders: mockFolders,
  onCreateFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  user: null,
  onLogout: vi.fn(),
  onLogin: vi.fn(),
  isMobileOpen: false,
  onMobileClose: vi.fn(),
};

describe('Sidebar Mobile Responsiveness', () => {
  it('renders with mobile close button when isMobileOpen is true', () => {
    render(<Sidebar {...defaultProps} isMobileOpen={true} />);
    // The close button should be present (has aria-label)
    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
  });

  it('renders backdrop when isMobileOpen is true', () => {
    const { container } = render(<Sidebar {...defaultProps} isMobileOpen={true} />);
    // Check for backdrop overlay (it's a fixed div with bg-black/50)
    const backdrop = container.querySelector('.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();
  });

  it('does not render backdrop when isMobileOpen is false', () => {
    const { container } = render(<Sidebar {...defaultProps} isMobileOpen={false} />);
    const backdrop = container.querySelector('.bg-black\\/50');
    expect(backdrop).not.toBeInTheDocument();
  });

  it('calls onMobileClose when close button is clicked', () => {
    const onMobileClose = vi.fn();
    render(<Sidebar {...defaultProps} isMobileOpen={true} onMobileClose={onMobileClose} />);
    
    fireEvent.click(screen.getByLabelText('Close sidebar'));
    expect(onMobileClose).toHaveBeenCalled();
  });

  it('calls onMobileClose when backdrop is clicked', () => {
    const onMobileClose = vi.fn();
    const { container } = render(<Sidebar {...defaultProps} isMobileOpen={true} onMobileClose={onMobileClose} />);
    
    const backdrop = container.querySelector('.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onMobileClose).toHaveBeenCalled();
    }
  });

  it('calls onMobileClose when selecting a folder', () => {
    const onMobileClose = vi.fn();
    const setActiveFolder = vi.fn();
    render(<Sidebar {...defaultProps} isMobileOpen={true} onMobileClose={onMobileClose} setActiveFolder={setActiveFolder} />);
    
    fireEvent.click(screen.getByText('Work'));
    expect(setActiveFolder).toHaveBeenCalledWith('Work');
    expect(onMobileClose).toHaveBeenCalled();
  });

  it('applies correct transform class when isMobileOpen is true', () => {
    const { container } = render(<Sidebar {...defaultProps} isMobileOpen={true} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('translate-x-0');
  });

  it('applies hidden transform class when isMobileOpen is false', () => {
    const { container } = render(<Sidebar {...defaultProps} isMobileOpen={false} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('-translate-x-full');
  });
});
