import { useState, useEffect } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { X, Save, Eye, Edit2, Trash2, Bold, Italic, List, ListOrdered, Quote, Heading2, ImageIcon, Type, Folder as FolderIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { supabase } from '../lib/supabase'
import SmartDateInput from './SmartDateInput'

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
  folder?: string
  images?: NoteImage[]
}

interface Folder {
  id: string
  name: string
}

interface EditorProps {
  note: Note | null
  isOpen: boolean
  onClose: () => void
  onSave: (note: Note) => void
  onDelete: (id: string) => void
  folders: Folder[]
  activeFolder?: string
}

export function Editor({ note, isOpen, onClose, onSave, onDelete, folders, activeFolder = 'Unsorted' }: EditorProps) {
  const [title, setTitle] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('Unsorted')
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false)
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [isPreview, setIsPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [attachedImages, setAttachedImages] = useState<NoteImage[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure blockquote to be easier to exit
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400',
          },
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your thoughts...',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg shadow-md max-w-full my-4',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-8 py-6',
          textSize === 'small' && 'prose-sm',
          textSize === 'medium' && 'prose-base',
          textSize === 'large' && 'prose-lg'
        ),
      },
      // Handle keyboard events for better blockquote exit
      handleKeyDown: (view, event) => {
        // Exit blockquote on Backspace at the start of an empty blockquote
        if (event.key === 'Backspace') {
          const { state } = view
          const { selection } = state
          const { $from } = selection
          
          // Check if we're in a blockquote
          const blockquote = $from.node(-1)
          if (blockquote?.type.name === 'blockquote') {
            // Check if cursor is at the start and content is empty or just a paragraph
            const parentOffset = $from.parentOffset
            if (parentOffset === 0) {
              const paragraph = $from.parent
              if (paragraph.content.size === 0) {
                // Exit blockquote
                return false // Let TipTap handle it - it will lift the content out
              }
            }
          }
        }
        
        // Exit blockquote on double Enter (Enter on empty line)
        if (event.key === 'Enter' && !event.shiftKey) {
          const { state } = view
          const { selection } = state
          const { $from } = selection
          
          // Check if we're in a blockquote
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'blockquote') {
              // Check if current paragraph is empty
              const paragraph = $from.parent
              if (paragraph.type.name === 'paragraph' && paragraph.content.size === 0) {
                // Don't prevent default - let TipTap's built-in behavior handle exiting
                return false
              }
              break
            }
          }
        }
        
        return false
      },
    },
  })

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      editor?.commands.setContent(note.content)
      setAttachedImages(note.images || [])
      setSelectedFolder(note.folder || 'Unsorted')
      // Set date from note, or today if not present
      setDate(note.date ? new Date(note.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    } else {
      // New note - use activeFolder (or 'Unsorted' if viewing 'All Notes')
      setTitle('')
      editor?.commands.setContent('')
      setAttachedImages([])
      setSelectedFolder(activeFolder === 'All Notes' ? 'Unsorted' : activeFolder)
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [note, editor, activeFolder])

  // Update editor class when textSize changes
  useEffect(() => {
    if (editor) {
      // Note: we only update the attributes class, not overwriting other editorProps
      const currentView = editor.view
      if (currentView && currentView.dom) {
        currentView.dom.className = cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-8 py-6',
          textSize === 'small' && 'prose-sm',
          textSize === 'medium' && 'prose-base',
          textSize === 'large' && 'prose-lg'
        )
      }
    }
  }, [textSize, editor])



  if (!isOpen) return null

  const handleSave = () => {
    if (!editor) return
    onSave({
      id: note?.id || '',
      title,
      content: editor.getHTML(),
      date: date, // Pass selected date string (YYYY-MM-DD)
      folder: selectedFolder,
      images: attachedImages
    })
  }

  const resizeImage = (file: File, targetWidth: number, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        let width = img.width
        let height = img.height
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > targetWidth) {
          const scale = targetWidth / width
          width = targetWidth
          height = height * scale
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not resize image'))
            return
          }
          // Construct new filename with size suffix
          const nameParts = file.name.split('.')
          const ext = nameParts.pop()
          const name = nameParts.join('.')
          const newName = `${name}_${targetWidth}w.${ext}`

          const resizedFile = new File([blob], newName, {
            type: file.type,
            lastModified: Date.now(),
          })
          resolve(resizedFile)
        }, file.type, quality)
      }
      img.onerror = (error) => reject(error)
    })
  }

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath)
      
    return publicUrl
  }

  const addImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      if (input.files?.length) {
        const originalFile = input.files[0]
        setIsUploading(true)
        try {
          // Generate 3 versions
          const [thumbFile, mediumFile, largeFile] = await Promise.all([
            resizeImage(originalFile, 300, 0.7),
            resizeImage(originalFile, 800, 0.8),
            resizeImage(originalFile, 1600, 0.8)
          ])

          // Upload all 3
          const [thumbUrl, mediumUrl, largeUrl] = await Promise.all([
            uploadFile(thumbFile),
            uploadFile(mediumFile),
            uploadFile(largeFile)
          ])

          // Insert Medium version into editor for display
          editor?.chain().focus().setImage({ src: mediumUrl }).run()
          
          // Store in a temporary state for this session
          setAttachedImages(prev => [...prev, { thumb: thumbUrl, medium: mediumUrl, large: largeUrl }])

        } catch (error) {
          console.error('Error uploading image:', error)
          alert('Error uploading image')
        } finally {
          setIsUploading(false)
        }
      }
    }
    input.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm p-0 sm:p-4 lg:p-8 transition-colors duration-300 animate-in fade-in duration-200">
      <div className="w-full h-full sm:max-w-4xl sm:h-[90vh] lg:h-[85vh] bg-white dark:bg-gray-900 sm:border border-gray-200 dark:border-gray-800 sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          {/* Main header row */}
          <div className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Close button (visible on mobile at left) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 sm:hidden"
              title="Close"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Entry"
              className="bg-transparent text-lg sm:text-xl font-serif font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none flex-1 min-w-0 mr-2 sm:mr-4"
            />
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                onClick={handleSave}
                className="gap-1 sm:gap-2 px-3 sm:px-4"
                disabled={isUploading}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Save'}</span>
              </Button>
              
              {/* Desktop close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hidden sm:flex"
                title="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Secondary controls row */}
          <div className="h-12 flex items-center gap-1 px-2 sm:px-4 lg:px-8 border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
            {/* Date Picker */}
            <SmartDateInput
              value={date}
              onChange={setDate}
              className="w-auto"
            />

            {/* Folder Picker */}
            <div className="relative">
              <button 
                onClick={() => setIsFolderPickerOpen(!isFolderPickerOpen)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <FolderIcon className="w-4 h-4" />
                <span className="max-w-[60px] sm:max-w-[100px] truncate">{selectedFolder}</span>
              </button>
              
              {isFolderPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsFolderPickerOpen(false)} 
                  />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setSelectedFolder('Unsorted')
                        setIsFolderPickerOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
                        selectedFolder === 'Unsorted' ? "text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      Unsorted
                    </button>
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolder(folder.name)
                          setIsFolderPickerOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
                          selectedFolder === folder.name ? "text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

            {/* Text Size Toggle - hidden on small mobile */}
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setTextSize('small')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  textSize === 'small' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Small Text"
              >
                <Type className="w-3 h-3" />
              </button>
              <button
                onClick={() => setTextSize('medium')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  textSize === 'medium' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Medium Text"
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTextSize('large')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  textSize === 'large' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Large Text"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="gap-1 sm:gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 sm:px-3"
            >
              {isPreview ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </>
              )}
            </Button>
            
            {note && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(note.id)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {!isPreview && editor && (
          <div className="border-b border-gray-100 dark:border-gray-800 px-3 sm:px-4 lg:px-8 py-2 flex items-center gap-1 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('bold') && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('italic') && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('heading', { level: 2 }) && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('bulletList') && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('orderedList') && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
              className={cn("h-8 px-2 text-gray-500 dark:text-gray-400", editor.isActive('blockquote') && "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white")}
            >
              <Quote className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.preventDefault(); addImage() }}
              className="h-8 px-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex bg-white dark:bg-gray-900 relative">
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300", editor.isActive('bold') && 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white')}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300", editor.isActive('italic') && 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white')}
              >
                <Italic className="w-4 h-4" />
              </button>
            </BubbleMenu>
          )}

          {isPreview ? (
            <div 
              className={cn(
                "flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto prose dark:prose-invert max-w-none",
                textSize === 'small' && 'prose-sm',
                textSize === 'medium' && 'prose-base',
                textSize === 'large' && 'prose-lg'
              )}
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
              data-lenis-prevent
            />
          ) : (
            <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()} data-lenis-prevent>
              <EditorContent editor={editor} className="px-4 sm:px-6 lg:px-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
