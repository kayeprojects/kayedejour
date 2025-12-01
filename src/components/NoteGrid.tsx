import { Plus } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { motion } from 'framer-motion'
import { VirtuosoGrid } from 'react-virtuoso'
import { forwardRef } from 'react'

interface Note {
  id: string
  title: string
  content: string
  date: string
  images?: { thumb: string; medium: string; large: string }[]
}

interface NoteGridProps {
  notes: Note[]
  onNoteClick: (note: Note) => void
  onNewNote: () => void
}

const GridContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20" />
))

const GridItem = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} className="h-full" />
))

export function NoteGrid({ notes, onNoteClick, onNewNote }: NoteGridProps) {
  // Prepend a placeholder for the "New Entry" card
  const allItems = ['new-entry', ...notes]

  return (
    <VirtuosoGrid
      useWindowScroll
      totalCount={allItems.length}
      components={{
        List: GridContainer,
        Item: GridItem
      }}
      itemContent={(index) => {
        const item = allItems[index]

        if (item === 'new-entry') {
          return (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewNote}
              className="w-full h-64 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex flex-col items-center justify-center gap-3 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">New Entry</span>
            </motion.button>
          )
        }

        return (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <NoteCard note={item as Note} onClick={() => onNoteClick(item as Note)} />
          </motion.div>
        )
      }}
    />
  )
}
