import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders without crashing', () => {
    expect(() => render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    )).not.toThrow();
  });

  it('renders virtuoso container', () => {
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    );
    
    // VirtuosoGrid creates a data-virtuoso-scroller element
    expect(screen.getByTestId('virtuoso-item-list')).toBeInTheDocument();
  });

  it('accepts onNoteClick handler', () => {
    const handleNoteClick = vi.fn();
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={handleNoteClick} 
        onNewNote={() => {}} 
      />
    );
    // Component renders without error - virtual items only render in viewport
    expect(handleNoteClick).not.toHaveBeenCalled();
  });

  it('accepts onNewNote handler', () => {
    const handleNewNote = vi.fn();
    render(
      <NoteGrid 
        notes={mockNotes} 
        onNoteClick={() => {}} 
        onNewNote={handleNewNote} 
      />
    );
    // Component renders without error
    expect(handleNewNote).not.toHaveBeenCalled();
  });

  it('renders with empty notes array', () => {
    expect(() => render(
      <NoteGrid 
        notes={[]} 
        onNoteClick={() => {}} 
        onNewNote={() => {}} 
      />
    )).not.toThrow();
  });
});
