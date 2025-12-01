import { useState } from 'react'
import { Folder, Plus, Book, Trash2, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface FolderType {
  id: number
  name: string
}

interface SidebarProps {
  activeFolder: string
  setActiveFolder: (folder: string) => void
  folders: FolderType[]
  onCreateFolder: (name: string) => void
  onDeleteFolder: (id: number) => void
  user: User
  onLogout: () => void
}

export function Sidebar({ activeFolder, setActiveFolder, folders, onCreateFolder, onDeleteFolder, user, onLogout }: SidebarProps) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300 sticky top-0 h-screen shrink-0 z-20">
      {/* Title */}
      <div className="p-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-2">
          kayedejour'
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 mb-4 px-3 uppercase tracking-wider">Collections</div>
        
        <button
          onClick={() => setActiveFolder('All Notes')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
            activeFolder === 'All Notes' 
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700 font-medium' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <Book className={cn("w-4 h-4", activeFolder === 'All Notes' ? 'text-gray-900 dark:text-white' : 'text-gray-400')} />
          All Notes
        </button>
        
        <AnimatePresence initial={false}>
          {folders.map((folder) => (
            <motion.div 
              key={folder.id} 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="group relative flex items-center"
            >
              <button
                onClick={() => setActiveFolder(folder.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                  activeFolder === folder.name 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700 font-medium' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <Folder className={cn("w-4 h-4", activeFolder === folder.name ? 'text-gray-900 dark:text-white' : 'text-gray-400')} />
                <span className="truncate">{folder.name}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteFolder(folder.id)
                }}
                className="absolute right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {isCreatingFolder ? (
          <form onSubmit={handleCreateSubmit} className="px-3 py-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onBlur={() => setIsCreatingFolder(false)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 dark:text-white"
            />
          </form>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsCreatingFolder(true)}
            className="w-full justify-start gap-3 px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 relative">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {user.user_metadata.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.user_metadata.full_name || user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isProfileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
            >
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start gap-2 px-4 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-500"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
