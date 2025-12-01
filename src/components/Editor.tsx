import { useState, useEffect } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { X, Save, Eye, Edit2, Trash2, Bold, Italic, List, ListOrdered, Quote, Heading2, ImageIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { supabase } from '../lib/supabase'

interface NoteImage {
  thumb: string
  medium: string
  large: string
}

interface Note {
  id: number
  title: string
  content: string
  date: string
  images?: NoteImage[]
}

interface EditorProps {
  note: Note | null
  isOpen: boolean
  onClose: () => void
  onSave: (note: Note) => void
  onDelete: (id: number) => void
}

export function Editor({ note, isOpen, onClose, onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [attachedImages, setAttachedImages] = useState<NoteImage[]>([])

  const editor = useEditor({
    extensions: [
      StarterKit,
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
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-8 py-6',
      },
    },
  })

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      editor?.commands.setContent(note.content)
      setAttachedImages(note.images || [])
    } else {
      setTitle('')
      editor?.commands.setContent('')
      setAttachedImages([])
    }
  }, [note, editor])

  if (!isOpen) return null

  const handleSave = () => {
    if (!editor) return
    onSave({
      id: note?.id || 0,
      title,
      content: editor.getHTML(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
          
          // TODO: We should ideally track these URLs to save them in the 'images' column
          // For now, we rely on the editor content, but for the Grid View thumbnail requirement,
          // we need to pass this data back up. 
          // Let's attach it to the editor instance or state if possible, 
          // or just rely on parsing the content later? 
          // Better: The user wants "Grid pakai thumb". 
          // So we MUST save the `thumbUrl` somewhere.
          // I will update the onSave to include an `images` array.
          
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm p-4 sm:p-8 transition-colors duration-300 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 bg-white dark:bg-gray-900 shrink-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Entry"
            className="bg-transparent text-xl font-serif font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none w-full mr-4"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {isPreview ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
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

            <Button
              onClick={handleSave}
              className="gap-2"
              disabled={isUploading}
            >
              <Save className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Save'}
            </Button>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-2" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        {!isPreview && editor && (
          <div className="border-b border-gray-100 dark:border-gray-800 px-8 py-2 flex items-center gap-1 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 overflow-x-auto">
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
              className="flex-1 p-8 overflow-y-auto prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
              data-lenis-prevent
            />
          ) : (
            <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()} data-lenis-prevent>
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
