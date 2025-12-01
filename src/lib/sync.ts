import { supabase } from './supabase';
import { db } from './db';

export async function syncNotes(userId: string) {
  try {
    // 1. PUSH: Find dirty notes
    const dirtyNotes = await db.notes.where('is_dirty').equals(1).toArray();
    
    if (dirtyNotes.length > 0) {


      // Separate deletes from upserts
      const toDelete = dirtyNotes.filter(n => n.is_deleted === 1);
      const toUpsert = dirtyNotes.filter(n => n.is_deleted === 0);

      if (toUpsert.length > 0) {
        const { error } = await supabase.from('notes').upsert(
          toUpsert.map(n => ({
             id: n.id,
             title: n.title,
             content: n.content,
             folder: n.folder,
             user_id: n.user_id,
             images: n.images,
             created_at: n.created_at,
             updated_at: n.updated_at
          }))
        );
        if (error) throw error;
      }

      if (toDelete.length > 0) {
        const { error } = await supabase.from('notes').delete().in('id', toDelete.map(n => n.id));
        if (error) throw error;
        
        // Remove from local DB permanently after sync
        await db.notes.bulkDelete(toDelete.map(n => n.id));
      }

      // Mark local as clean
      await db.notes.bulkPut(toUpsert.map(n => ({ ...n, is_dirty: 0 })));
    }

    // 2. PULL: Get latest from server
    // For simplicity, we get ALL notes for now, or we could track last_sync_time.
    // Let's get all for robust sync in this "Simple" version.
    const { data: serverNotes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    if (serverNotes) {
      // We need to merge. "Last Write Wins" based on updated_at.
      // But since we just pushed our changes, server should be up to date with us.
      // We only care about changes from OTHER devices.
      
      await db.transaction('rw', db.notes, async () => {
        for (const sNote of serverNotes) {
          const localNote = await db.notes.get(sNote.id);
          
          // If we have a local dirty copy, we might have a conflict.
          // Simple rule: If local is dirty, keep local (it will be pushed next time).
          // Or compare timestamps.
          
          if (!localNote) {
            // New from server
            await db.notes.add({
              id: sNote.id,
              title: sNote.title || '',
              content: sNote.content || '',
              folder: sNote.folder || 'Unsorted',
              user_id: sNote.user_id,
              images: sNote.images || [],
              created_at: sNote.created_at,
              updated_at: sNote.updated_at || sNote.created_at,
              is_dirty: 0,
              is_deleted: 0
            });
          } else if (localNote.is_dirty === 0) {
             // Only update if server has newer data
             const serverTime = new Date(sNote.updated_at || sNote.created_at).getTime();
             const localTime = new Date(localNote.updated_at).getTime();

             if (serverTime > localTime) {
               await db.notes.put({
                 ...localNote,
                 title: sNote.title || '',
                 content: sNote.content || '',
                 folder: sNote.folder || 'Unsorted',
                 images: sNote.images || [],
                 updated_at: sNote.updated_at || sNote.created_at,
                 is_dirty: 0
               });
             }
          }
        }
      });
    }

  } catch (error) {
    console.error("Sync failed details:", JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function syncFolders(userId: string) {
  try {
    // Similar logic for folders
    const dirtyFolders = await db.folders.where('is_dirty').equals(1).toArray();
    
    // Push
    const toDelete = dirtyFolders.filter(f => f.is_deleted === 1);
    const toUpsert = dirtyFolders.filter(f => f.is_deleted === 0);

    if (toUpsert.length > 0) {
        const { error } = await supabase.from('folders').upsert(toUpsert.map(f => ({
            id: f.id,
            name: f.name,
            user_id: f.user_id,
            created_at: f.created_at
        })));
        if (error) throw error;
    }

    if (toDelete.length > 0) {
        const { error } = await supabase.from('folders').delete().in('id', toDelete.map(f => f.id));
        if (error) throw error;
        await db.folders.bulkDelete(toDelete.map(f => f.id));
    }
    
    await db.folders.bulkPut(toUpsert.map(f => ({ ...f, is_dirty: 0 })));

    // Pull
    const { data: serverFolders, error } = await supabase.from('folders').select('*').eq('user_id', userId);
    if (error) throw error;

    if (serverFolders) {
        await db.transaction('rw', db.folders, async () => {
            for (const sFolder of serverFolders) {
                const localFolder = await db.folders.get(sFolder.id.toString());
                if (!localFolder) {
                    await db.folders.add({
                        id: sFolder.id.toString(),
                        name: sFolder.name,
                        user_id: sFolder.user_id,
                        created_at: sFolder.created_at,
                        is_dirty: 0,
                        is_deleted: 0
                    });
                } else if (localFolder.is_dirty === 0) {
                    await db.folders.put({
                        ...localFolder,
                        name: sFolder.name,
                        is_dirty: 0
                    });
                }
            }
        });
    }
  } catch (error) {
    console.error("Sync folders failed details:", JSON.stringify(error, null, 2));
    throw error;
  }
}
