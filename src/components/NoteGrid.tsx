import { Plus } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { motion } from 'framer-motion'

interface Note {
  id: number
  title: string
  content: string
  date: string
}

interface NoteGridProps {
  notes: Note[]
  onNoteClick: (note: Note) => void
  onNewNote: () => void
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function NoteGrid({ notes, onNoteClick, onNewNote }: NoteGridProps) {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {/* New Note Card */}
      <motion.button 
        variants={item}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNewNote}
        className="h-64 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex flex-col items-center justify-center gap-3 transition-colors duration-200 group"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
          <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">New Entry</span>
      </motion.button>

      {/* Note Cards */}
      {notes.map((note) => (
        <motion.div key={note.id} variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <NoteCard note={note} onClick={() => onNoteClick(note)} />
        </motion.div>
      ))}
    </motion.div>
  )
}
