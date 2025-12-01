interface NoteImage {
  thumb: string
  medium: string
  large: string
}

interface Note {
  id: string
  title: string
  content: string
  date: string
  images?: NoteImage[]
}

interface NoteCardProps {
  note: Note
  onClick: () => void
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const coverImage = note.images && note.images.length > 0 ? note.images[0].thumb : null

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-lg flex flex-col border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden h-auto min-h-[200px]"
    >
      {coverImage && (
        <div className="h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img 
            src={coverImage} 
            alt="Note cover" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {new Date(note.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h3 className="text-lg font-serif font-medium text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-black dark:group-hover:text-white transition-colors">
          {note.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-5 leading-relaxed font-light">
          {note.content.replace(/<[^>]+>/g, '')}
        </p>
      </div>
    </div>
  )
}
