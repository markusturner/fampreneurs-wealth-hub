import { useEffect, useRef, type MouseEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  onChange: (html: string) => void
}

export function LessonRichTextEditor({ content, onChange }: Props) {
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false,
        underline: false,
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] px-4 py-3 focus:outline-none prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground',
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData('text/html')
        if (html) return false
        return false
      },
    },
  })

  // Only sync content from parent when it's an external change (e.g. switching lessons)
  useEffect(() => {
    if (!editor) return
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    const currentHTML = editor.getHTML()
    if (currentHTML !== content) {
      editor.commands.setContent(content || '')
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
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Link URL', previousUrl || '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const tb = (active: boolean) =>
    cn('h-8 w-8 p-0 rounded flex items-center justify-center transition-colors text-sm cursor-pointer select-none',
      active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground')

  const cmd = (e: MouseEvent, action: () => boolean) => {
    e.preventDefault()
    e.stopPropagation()
    action()
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
        {/* Headings */}
        <button type="button" className={tb(editor.isActive('heading', { level: 1 }))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())} title="Heading 1"><span className="text-xs font-bold">H<sub>1</sub></span></button>
        <button type="button" className={tb(editor.isActive('heading', { level: 2 }))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())} title="Heading 2"><span className="text-xs font-bold">H<sub>2</sub></span></button>
        <button type="button" className={tb(editor.isActive('heading', { level: 3 }))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())} title="Heading 3"><span className="text-xs font-bold">H<sub>3</sub></span></button>
        <button type="button" className={tb(editor.isActive('heading', { level: 4 }))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleHeading({ level: 4 }).run())} title="Heading 4"><span className="text-xs font-bold">H<sub>4</sub></span></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Text style */}
        <button type="button" className={tb(editor.isActive('bold'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleBold().run())} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('italic'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleItalic().run())} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('underline'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleUnderline().run())} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('strike'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleStrike().run())} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('code'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleCode().run())} title="Code"><Code className="h-3.5 w-3.5" /></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Lists & blocks */}
        <button type="button" className={tb(editor.isActive('bulletList'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleBulletList().run())} title="Bullet list"><List className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('orderedList'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleOrderedList().run())} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('blockquote'))} onMouseDown={(e) => cmd(e, () => editor.chain().focus().toggleBlockquote().run())} title="Quote"><Quote className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(false)} onMouseDown={(e) => cmd(e, () => editor.chain().focus().setHorizontalRule().run())} title="Divider"><Minus className="h-3.5 w-3.5" /></button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Media */}
        <button type="button" className={tb(false)} onMouseDown={(e) => { cmd(e, () => { addImage(); return true }) }} title="Insert image"><ImageIcon className="h-3.5 w-3.5" /></button>
        <button type="button" className={tb(editor.isActive('link'))} onMouseDown={(e) => { cmd(e, () => { addLink(); return true }) }} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></button>
      </div>
      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}