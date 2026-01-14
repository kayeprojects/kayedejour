import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteCard } from '../NoteCard';

const mockNote = {
  id: '1',
  title: 'Test Note',
  content: '<p>This is test content</p>',
  date: '2023-06-15T10:30:00.000Z',
  folder: 'Work',
  images: []
};

describe('NoteCard', () => {
  it('renders note title', () => {
    render(<NoteCard note={mockNote} onClick={() => {}} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<NoteCard note={mockNote} onClick={() => {}} />);
    // Date formatting depends on locale, check for parts
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('renders content excerpt without HTML tags', () => {
    render(<NoteCard note={mockNote} onClick={() => {}} />);
    expect(screen.getByText(/This is test content/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<NoteCard note={mockNote} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Test Note'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('displays "Untitled" for notes without title', () => {
    const untitledNote = { ...mockNote, title: '' };
    render(<NoteCard note={untitledNote} onClick={() => {}} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('handles notes with empty content gracefully', () => {
    const emptyNote = { ...mockNote, content: '' };
    render(<NoteCard note={emptyNote} onClick={() => {}} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays thumbnail if images exist', () => {
    const noteWithImage = {
      ...mockNote,
      images: [{ thumb: 'https://example.com/thumb.jpg', medium: '', large: '' }]
    };
    render(<NoteCard note={noteWithImage} onClick={() => {}} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });
});
