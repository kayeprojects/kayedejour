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

// Helper function to extract readable text from HTML content
function getPreviewText(htmlContent: string): string {
  // Replace block elements with newlines for proper spacing
  let text = htmlContent
    // Replace closing paragraph/div/heading tags with newline + space
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    // Replace <br> with newline
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace list items with bullet points
    .replace(/<li[^>]*>/gi, '• ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Collapse multiple newlines into max 2
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Trim whitespace
    .trim()
  
  return text
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const coverImage = note.images && note.images.length > 0 ? note.images[0].thumb : null
  const previewText = getPreviewText(note.content)

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-lg flex flex-col border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden h-auto min-h-[180px] sm:min-h-[200px] active:scale-[0.98] active:shadow-sm"
    >
      {coverImage && (
        <div className="h-32 sm:h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img 
            src={coverImage} 
            alt="Note cover" 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {new Date(note.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-serif font-medium text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 line-clamp-2 group-hover:text-black dark:group-hover:text-white transition-colors">
          {note.title || 'Untitled'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 sm:line-clamp-4 leading-relaxed whitespace-pre-line">
          {previewText}
        </p>
      </div>
    </div>
  )
}

