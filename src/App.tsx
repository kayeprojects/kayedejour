import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Sidebar } from "./components/Sidebar";
import { NoteGrid } from "./components/NoteGrid";
import { Editor } from "./components/Editor";
import type { Session } from "@supabase/supabase-js";
import { LogIn, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";

interface NoteImage {
  thumb: string
  medium: string
  large: string
}

interface Note {
  id: number;
  title: string;
  content: string;
  date: string;
  folder?: string;
  user_id?: string;
  images?: NoteImage[];
}

interface Folder {
  id: number;
  name: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeFolder, setActiveFolder] = useState("All Notes");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchNotes();
      fetchFolders();

      // Realtime subscription for Notes
      const channel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Realtime update:', payload)
            fetchNotes() // Refresh notes on any change
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session]);

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  async function fetchFolders() {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("name");

      if (error) throw error;
      if (data) setFolders(data);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }

  async function fetchNotes() {
    if (!session?.user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setNotes(
          data.map((n) => ({
            id: n.id,
            title: n.title || "Untitled",
            content: n.content || "",
            date: new Date(n.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            folder: n.folder || "All Notes",
            user_id: n.user_id,
            images: n.images || []
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setNotes([]);
    setFolders([]);
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
    if (!session?.user) return;

    try {
      const noteToSave = {
        title: noteData.title,
        content: noteData.content,
        folder: activeFolder === "All Notes" ? "Unsorted" : activeFolder,
        user_id: session.user.id,
        images: noteData.images
      };

      if (noteData.id && noteData.id !== 0) {
        // Update existing
        const { error } = await supabase
          .from("notes")
          .update(noteToSave)
          .eq("id", noteData.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("notes").insert([noteToSave]);

        if (error) throw error;
      }

      await fetchNotes();
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note");
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);

      if (error) throw error;
      await fetchNotes();
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from("folders")
        .insert([{ name, user_id: session.user.id }]);

      if (error) throw error;
      await fetchFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm("Are you sure you want to delete this folder?")) return;
    try {
      const { error } = await supabase.from("folders").delete().eq("id", id);

      if (error) throw error;
      await fetchFolders();
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

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-md w-full"
        >
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            kayedejour'
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to access your digital sanctuary.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 py-3 px-6 rounded-lg transition-all duration-200 font-medium"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

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
        user={session.user}
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
          <Editor
            isOpen={isEditorOpen}
            note={editingNote}
            onClose={() => setIsEditorOpen(false)}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
