import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { Sidebar } from "./components/Sidebar";
import { NoteGrid } from "./components/NoteGrid";
// import { Editor } from "./components/Editor"; // Lazy loaded below
import type { Session } from "@supabase/supabase-js";
import { Moon, Sun, RefreshCw, Search, Check, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
// import Lenis from "lenis"; // Disabled - caused scroll glitches with sticky header
import { db } from "./lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { syncNotes, syncFolders } from "./lib/sync";
import { cn } from "./lib/utils";
import type { Note } from "./lib/types";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Editor = lazy(() => import("./components/Editor").then(module => ({ default: module.Editor })));


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeFolder, setActiveFolder] = useState("All Notes");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  // Load dark mode from localStorage, default to true
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });

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
    
    // Check if local data belongs to current user
    const existingNotes = await db.notes.limit(1).toArray();
    const existingNote = existingNotes[0];
    
    // If there's existing data from a DIFFERENT user, clear local DB first
    if (existingNote && existingNote.user_id && existingNote.user_id !== session.user.id) {
      console.log("Different user detected, clearing local database...");
      await db.notes.clear();
      await db.folders.clear();
    }
    
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
      // Local DB has data for current user. 
      // We should trigger a sync to pull user's cloud notes and merge them.
      console.log("Local data exists for current user, syncing with cloud...");
      handleSync();
      setIsLoading(false);
    }
  }

  // Dark Mode Effect - save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // Track pending changes (dirty notes count)
  useEffect(() => {
    const countDirty = async () => {
      const count = await db.notes.where('is_dirty').equals(1).count();
      setPendingChangesCount(count);
    };
    countDirty();
    // Re-check periodically
    const interval = setInterval(countDirty, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N - New note
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
      // Escape - Close editor
      if (e.key === 'Escape' && isEditorOpen) {
        setIsEditorOpen(false);
      }
      // Ctrl+Shift+S - Sync
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen]);

  const handleSync = async () => {
    if (!session?.user) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        syncNotes(session.user.id),
        syncFolders(session.user.id)
      ]);
      setLastSyncTime(new Date());
      setPendingChangesCount(0);
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
    // Clear local database to prevent notes from previous user being visible
    await db.notes.clear();
    await db.folders.clear();
    
    await supabase.auth.signOut();
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
      
      // Determine folder: 
      // - For new notes: use activeFolder (or "Unsorted" if viewing All Notes)
      // - For existing notes: preserve the original folder
      let folder: string;
      if (noteData.id && noteData.id !== '') {
        // Editing existing note - preserve original folder
        folder = noteData.folder || "Unsorted";
      } else {
        // New note - use current active folder
        folder = activeFolder === "All Notes" ? "Unsorted" : activeFolder;
      }

      const noteToSave = {
        title: noteData.title,
        content: noteData.content,
        folder,
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

  // Filter notes by folder and search query
  const filteredNotes = notes.filter((n) => {
    // Folder filter
    const matchesFolder = activeFolder === "All Notes" || n.folder === activeFolder;
    
    // Search filter (case-insensitive)
    const matchesSearch = searchQuery.trim() === "" || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFolder && matchesSearch;
  });

  // Lenis Smooth Scroll - DISABLED due to conflicts with sticky header
  // Native browser scroll is smoother in modern browsers anyway
  // useEffect(() => {
  //   const lenis = new Lenis();

  //   function raf(time: number) {
  //     lenis.raf(time);
  //     requestAnimationFrame(raf);
  //   }

  //   requestAnimationFrame(raf);

  //   return () => {
  //     lenis.destroy();
  //   };
  // }, []);

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
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gray-50 dark:bg-black/50 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center" />

        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-20 shrink-0">
          {/* Main header row */}
          <div className="h-14 sm:h-16 flex items-center px-3 sm:px-4 lg:px-8 gap-2 sm:gap-3">
            {/* Mobile hamburger menu */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 lg:hidden active:scale-95 transition-all"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <motion.h2
              key={activeFolder}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg sm:text-xl font-serif font-semibold tracking-tight text-gray-900 dark:text-white truncate flex-1 min-w-0"
            >
              {activeFolder}
            </motion.h2>
            
            {/* Desktop Search Bar */}
            <div className="flex-1 max-w-md mx-4 hidden lg:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            
            {/* Mobile search toggle */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={cn(
                "p-2.5 rounded-xl transition-all active:scale-95 lg:hidden",
                isMobileSearchOpen 
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              )}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Sync Status - hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {pendingChangesCount > 0 && (
                  <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                    {pendingChangesCount} pending
                  </span>
                )}
                {lastSyncTime && (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  "p-2.5 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95",
                  isSyncing && 'animate-spin'
                )}
                title="Sync Now (Ctrl+Shift+S)"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-all active:scale-95"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block px-2">
                {filteredNotes.length} entries
              </div>
            </div>
          </div>
          
          {/* Mobile Search Bar - Expandable */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden lg:hidden"
              >
                <div className="px-3 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes..."
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 text-base bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 z-10" id="scroll-container">
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
          <ErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">Loading Editor...</div>}>
              <Editor
                isOpen={isEditorOpen}
                note={editingNote}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveNote}
                onDelete={handleDeleteNote}
                folders={folders}
                activeFolder={activeFolder}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
