/**
 * Shared type definitions for Kayedejour app
 * This file centralizes all common interfaces to prevent duplication
 */

/**
 * Represents an image attached to a note with multiple resolutions
 */
export interface NoteImage {
  /** Thumbnail version (300px width) for grid view */
  thumb: string
  /** Medium version (800px width) for editor display */
  medium: string
  /** Large version (1600px width) for full view */
  large: string
}

/**
 * Represents a journal note/entry
 */
export interface Note {
  /** Unique identifier (UUID) */
  id: string
  /** Note title */
  title: string
  /** HTML content of the note */
  content: string
  /** ISO date string for when the note was created/dated */
  date: string
  /** Folder/collection the note belongs to (default: "Unsorted") */
  folder?: string
  /** User ID who owns this note */
  user_id?: string
  /** Attached images */
  images?: NoteImage[]
}

/**
 * Represents a folder/collection for organizing notes
 */
export interface Folder {
  /** Unique identifier (UUID) */
  id: string
  /** Folder display name */
  name: string
  /** User ID who owns this folder */
  user_id?: string
}

/**
 * Represents a user from Supabase auth
 * Simplified version of the full User type
 */
export interface AppUser {
  id: string
  email?: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
  }
}
