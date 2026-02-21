import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, Minus, Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  onChange: (html: string) => void
}

export function LessonRichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[200px] px-4 py-3 focus:outline-none prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground',
      },
    },
  })

  // Sync editor content when the prop changes (e.g. reopening dialog with new lesson)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML()
      if (currentHTML !== content) {
        editor.commands.setContent(content || '')
      }
    }
  }, [editor, content])

  if (!editor) return null

  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      // Convert to base64 for inline embedding
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        editor.chain().focus().setImage({ src: base64 }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const addLink = () => {
    const url = window.prompt('Link URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const addVideo = () => {
    const url = window.prompt('Video URL (YouTube, Vimeo, Loom)')
    if (!url) return
    // Insert as an iframe embed
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    let embedUrl = url
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
    else if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
    else if (loomMatch) embedUrl = `https://www.loom.com/embed/${loomMatch[1]}`
    editor.chain().focus().insertContent(
      `<div data-type="video" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:16px 0"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
    ).run()
  }

  const toolbarBtnClass = (active: boolean) =>
    cn('h-8 w-8 p-0 rounded flex items-center justify-center transition-colors text-sm',
      active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground')

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
        {/* Headings */}
        <button className={toolbarBtnClass(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><span className="text-xs font-bold">H1</span></button>
        <button className={toolbarBtnClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><span className="text-xs font-bold">H2</span></button>
        <button className={toolbarBtnClass(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><span className="text-xs font-bold">H3</span></button>
        <button className={toolbarBtnClass(editor.isActive('heading', { level: 4 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} title="H4"><span className="text-xs font-bold">H4</span></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Text style */}
        <button className={toolbarBtnClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()} title="Code"><Code className="h-3.5 w-3.5" /></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Lists */}
        <button className={toolbarBtnClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-3.5 w-3.5" /></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Media */}
        <button className={toolbarBtnClass(false)} onClick={addImage} title="Insert image"><ImageIcon className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(false)} onClick={addVideo} title="Insert video"><Video className="h-3.5 w-3.5" /></button>
        <button className={toolbarBtnClass(editor.isActive('link'))} onClick={addLink} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></button>
      </div>
      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}
