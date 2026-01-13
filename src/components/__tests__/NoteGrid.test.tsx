import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteGrid } from '../NoteGrid';

const mockNotes = [
  {
    id: '1',
    title: 'First Note',
    content: '<p>First content</p>',
    date: '2023-06-15T10:30:00.000Z',
    folder: 'Work',
    images: []
  },
  {
    id: '2',
    title: 'Second Note',
    content: '<p>Second content</p>',
    date: '2023-06-14T10:30:00.000Z',
    folder: 'Personal',
    images: []
  }
];

describe('NoteGrid', () => {
  it('renders all notes', () => {
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    );
    
    expect(screen.getByText('First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('renders "New Entry" card', () => {
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    );
    
    expect(screen.getByText('New Entry')).toBeInTheDocument();
  });

  it('calls onNewNote when New Entry is clicked', () => {
    const handleNewNote = vi.fn();
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={handleNewNote} 
      />
    );
    
    fireEvent.click(screen.getByText('New Entry'));
    expect(handleNewNote).toHaveBeenCalled();
  });

  it('calls onNoteClick with correct note when a note is clicked', () => {
    const handleNoteClick = vi.fn();
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={handleNoteClick} 
        onNewNote={() => {}} 
      />
    );
    
    fireEvent.click(screen.getByText('First Note'));
    expect(handleNoteClick).toHaveBeenCalledWith(mockNotes[0]);
  });

  it('renders empty state correctly', () => {
    render(
      <NoteGrid 
        notes={[]} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    );
    
    // Should still show New Entry card
    expect(screen.getByText('New Entry')).toBeInTheDocument();
  });
});
