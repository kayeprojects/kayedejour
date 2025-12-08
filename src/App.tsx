import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { Sidebar } from "./components/Sidebar";
import { NoteGrid } from "./components/NoteGrid";
// import { Editor } from "./components/Editor"; // Lazy loaded below
import type { Session } from "@supabase/supabase-js";
import { Moon, Sun, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import { db } from "./lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { syncNotes, syncFolders } from "./lib/sync";

const Editor = lazy(() => import("./components/Editor").then(module => ({ default: module.Editor })));

interface NoteImage {
  thumb: string
  medium: string
  large: string
}

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  folder?: string;
  user_id?: string;
  images?: NoteImage[];
}



function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeFolder, setActiveFolder] = useState("All Notes");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Live Queries from Dexie
  const notes = useLiveQuery(async () => {
    const dbNotes = await db.notes
      .where("is_deleted")
      .equals(0)
      .reverse()
      .sortBy("updated_at");
      
    return dbNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      date: n.created_at,
      folder: n.folder,
      user_id: n.user_id,
      images: n.images,
    }));
  }, []) || [];

  const folders = useLiveQuery(async () => {
    return await db.folders.where("is_deleted").equals(0).toArray();
  }, []) || [];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      // User is logged in
      checkAndMigrateData();
    } else {
      // Guest mode: stop loading immediately
      setIsLoading(false);
    }
  }, [session]);

  async function checkAndMigrateData() {
    if (!session?.user) return;
    const count = await db.notes.count();
    
    // If local DB is empty, try to migrate from Supabase (first login on this device)
    if (count === 0) {
      setIsLoading(true);
      console.log("Migrating data from Supabase...");
      
      // Fetch Notes
      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", session.user.id);

      if (notesData) {
        await db.notes.bulkPut(
          notesData.map((n: any) => ({
            id: n.id.toString(), // Ensure string ID
            title: n.title || "Untitled",
            content: n.content || "",
            folder: n.folder || "All Notes",
            user_id: n.user_id,
            images: n.images || [],
            created_at: n.created_at,
            updated_at: n.created_at, // Use created_at if updated_at is missing
            is_dirty: 0,
            is_deleted: 0,
          }))
        );
      }

      // Fetch Folders
      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", session.user.id);

      if (foldersData) {
        await db.folders.bulkPut(
          foldersData.map((f: any) => ({
            id: f.id.toString(),
            name: f.name,
            user_id: f.user_id,
            created_at: f.created_at,
            is_dirty: 0,
            is_deleted: 0,
          }))
        );
      }
      setIsLoading(false);
    } else {
      // Local DB has data (maybe guest notes). 
      // We should trigger a sync to pull user's cloud notes and merge them.
      console.log("Local data exists, syncing with cloud...");
      handleSync();
      setIsLoading(false);
    }
  }

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);



  const handleSync = async () => {
    if (!session?.user) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        syncNotes(session.user.id),
        syncFolders(session.user.id)
      ]);
    } catch (error) {
      console.error("Sync error:", error);
      alert("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Optional: Clear local DB on logout? 
    // For now, let's keep it. Or maybe clear it to avoid showing other user's data if they login on same device?
    // Ideally we filter by user_id in queries, which we do.
    // But for privacy, maybe clear?
    // Let's just reload page to clear memory state.
    window.location.reload();
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteData: Note) => {
    // if (!session?.user) return; // Allow guest save

    try {
      const now = new Date().toISOString();
      // Use the date selected by user (noteData.date) or fallback to now
      // Ensure we keep the time component if possible, or just default to T00:00:00 if it's just a date string
      // Actually, noteData.date will be an ISO string from the Editor
      const finalDate = noteData.date ? new Date(noteData.date).toISOString() : now;
      
      const noteToSave = {
        title: noteData.title,
        content: noteData.content,
        folder: activeFolder === "All Notes" ? "Unsorted" : activeFolder,
        user_id: session?.user?.id || "guest",
        images: noteData.images || [],
        updated_at: now, // Always update updated_at to now for sync
        is_dirty: 1,
        is_deleted: 0
      };

      if (noteData.id && noteData.id !== '') {
        // Update existing
        // If user changed the date, we should update created_at? 
        // Yes, user wants to "backdate" the journal. So we update created_at.
        await db.notes.update(noteData.id, { ...noteToSave, created_at: finalDate });
      } else {
        // Create new
        const newId = uuidv4();
        await db.notes.add({
          ...noteToSave,
          id: newId,
          created_at: finalDate,
        });
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await db.notes.update(id, { is_deleted: 1, is_dirty: 1 });
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  };

  const handleCreateFolder = async (name: string) => {
    // if (!session?.user) return; // Allow guest folder creation
    try {
      const newId = uuidv4();
      await db.folders.add({
        id: newId,
        name,
        user_id: session?.user?.id || "guest",
        created_at: new Date().toISOString(),
        is_dirty: 1,
        is_deleted: 0
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this folder?")) return;
    try {
      await db.folders.update(id, { is_deleted: 1, is_dirty: 1 });
      if (activeFolder !== "All Notes") setActiveFolder("All Notes");
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert("Failed to delete folder");
    }
  };

  const filteredNotes =
    activeFolder === "All Notes"
      ? notes
      : notes.filter((n) => n.folder === activeFolder);

  // Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // if (!session) {
  //   return (
  //     <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.5 }}
  //         className="text-center space-y-6 p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-md w-full"
  //       >
  //         <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-2">
  //           kayedejour'
  //         </h1>
  //         <p className="text-gray-500 dark:text-gray-400">
  //           Sign in to access your digital sanctuary.
  //         </p>
  //         <button
  //           onClick={handleLogin}
  //           className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 py-3 px-6 rounded-lg transition-all duration-200 font-medium"
  //         >
  //           <LogIn className="w-5 h-5" />
  //           Continue with Google
  //         </button>
  //       </motion.div>
  //     </div>
  //   );
  // }

  return (
    <div
      className={`flex min-h-screen w-full bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300`}
    >
      <Sidebar
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        user={session?.user || null}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gray-50 dark:bg-black/50">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center fixed" />

        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 sticky top-0">
          <motion.h2
            key={activeFolder}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-serif font-medium tracking-tight text-gray-900 dark:text-white"
          >
            {activeFolder}
          </motion.h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`p-2 rounded-full text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${isSyncing ? 'animate-spin' : ''}`}
              title="Sync Now"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredNotes.length} entries
            </div>
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 p-8 z-10" id="scroll-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Loading Journal...
            </div>
          ) : (
            <NoteGrid
              notes={filteredNotes}
              onNoteClick={handleEditNote}
              onNewNote={handleNewNote}
            />
          )}
        </div>
      </main>

      <AnimatePresence>
        {isEditorOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">Loading Editor...</div>}>
            <Editor
              isOpen={isEditorOpen}
              note={editingNote}
              onClose={() => setIsEditorOpen(false)}
              onSave={handleSaveNote}
              onDelete={handleDeleteNote}
              folders={folders}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
