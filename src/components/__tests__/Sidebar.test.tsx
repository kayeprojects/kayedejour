import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

const mockFolders = [
  { id: '1', name: 'Work', user_id: 'user1', created_at: '2023-01-01', is_dirty: 0, is_deleted: 0 },
  { id: '2', name: 'Personal', user_id: 'user1', created_at: '2023-01-02', is_dirty: 0, is_deleted: 0 }
];

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  user_metadata: { avatar_url: '', full_name: 'Test User' }
};

const defaultProps = {
  activeFolder: 'All Notes',
  setActiveFolder: vi.fn(),
  folders: mockFolders,
  onCreateFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  user: mockUser as any,
  onLogout: vi.fn(),
  onLogin: vi.fn()
};

describe('Sidebar', () => {
  it('renders app title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText(/kayedejour/)).toBeInTheDocument();
  });

  it('renders Collections section', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('COLLECTIONS')).toBeInTheDocument();
  });

  it('renders All Notes option', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('All Notes')).toBeInTheDocument();
  });

  it('renders all folders', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('highlights active folder', () => {
    render(<Sidebar {...defaultProps} activeFolder="Work" />);
    const workFolder = screen.getByText('Work').closest('button');
    expect(workFolder).toHaveClass('bg-gray-100');
  });

  it('calls setActiveFolder when folder is clicked', () => {
    const setActiveFolder = vi.fn();
    render(<Sidebar {...defaultProps} setActiveFolder={setActiveFolder} />);
    
    fireEvent.click(screen.getByText('Personal'));
    expect(setActiveFolder).toHaveBeenCalledWith('Personal');
  });

  it('calls setActiveFolder with All Notes when clicked', () => {
    const setActiveFolder = vi.fn();
    render(<Sidebar {...defaultProps} activeFolder="Work" setActiveFolder={setActiveFolder} />);
    
    fireEvent.click(screen.getByText('All Notes'));
    expect(setActiveFolder).toHaveBeenCalledWith('All Notes');
  });

  it('shows New Collection button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('New Collection')).toBeInTheDocument();
  });

  it('shows user avatar/sign in', () => {
    render(<Sidebar {...defaultProps} />);
    // Either shows user info or sign in button
    expect(screen.getByText(/Sign In|Test/)).toBeInTheDocument();
  });

  it('handles empty folders array', () => {
    render(<Sidebar {...defaultProps} folders={[]} />);
    expect(screen.getByText('All Notes')).toBeInTheDocument();
    expect(screen.getByText('New Collection')).toBeInTheDocument();
  });
});
