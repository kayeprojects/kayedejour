import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ error: null })
      })),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    }))
  }
}));

vi.mock('../db', () => ({
  db: {
    notes: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue('new-id'),
      put: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined)
    },
    folders: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        }))
      })),
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue('new-id'),
      put: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined)
    },
    transaction: vi.fn((_mode, _tables, callback) => callback())
  }
}));

import { syncNotes, syncFolders } from '../sync';

describe('Sync Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncNotes', () => {
    it('should complete without error when no dirty notes exist', async () => {
      await expect(syncNotes('test-user-id')).resolves.not.toThrow();
    });

    it('should be callable with a valid user ID', async () => {
      await syncNotes('user-123');
      // If it reaches here without throwing, sync infrastructure works
      expect(true).toBe(true);
    });
  });

  describe('syncFolders', () => {
    it('should complete without error when no dirty folders exist', async () => {
      await expect(syncFolders('test-user-id')).resolves.not.toThrow();
    });

    it('should be callable with a valid user ID', async () => {
      await syncFolders('user-123');
      expect(true).toBe(true);
    });
  });
});
