import Dexie, { type EntityTable } from 'dexie';

export interface Note {
  id: string; // UUID
  title: string;
  content: string;
  folder: string;
  user_id: string;
  images: { thumb: string; medium: string; large: string }[];
  created_at: string;
  updated_at: string;
  is_dirty: number; // 1 for true, 0 for false (for easier indexing)
  is_deleted: number;
}

export interface Folder {
  id: string; // UUID
  name: string;
  user_id: string;
  created_at: string;
  is_dirty: number;
  is_deleted: number;
}

const db = new Dexie('KayedejourDB') as Dexie & {
  notes: EntityTable<Note, 'id'>;
  folders: EntityTable<Folder, 'id'>; // Changing folder ID to string/UUID might break existing logic if not careful, but it's better for sync.
};

// Schema definition
db.version(1).stores({
  notes: 'id, folder, user_id, updated_at, is_dirty, is_deleted', // Index for querying
  folders: 'id, user_id, is_dirty, is_deleted'
});

export { db };
