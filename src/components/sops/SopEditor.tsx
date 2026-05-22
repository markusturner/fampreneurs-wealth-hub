import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Link as LinkIcon,
  Image as ImageIcon, Minus, Youtube as YoutubeIcon, Heading1, Heading2,
  Heading3, Code2, Sparkles, Paperclip,
} from 'lucide-react'

interface Props {
  content: string
  onChange: (html: string) => void
  editable?: boolean
}

// Convert embed-like URLs (Loom, Vimeo, Tella, Figma, Google Docs, generic) → iframe HTML
function urlToEmbedHtml(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null
  const wrap = (src: string) =>
    `<div class="my-4 aspect-video w-full overflow-hidden rounded-lg border border-border"><iframe src="${src}" loading="lazy" allow="autoplay; fullscreen; clipboard-write" allowfullscreen class="w-full h-full"></iframe></div>`

  // Loom
  let m = url.match(/loom\.com\/share\/([a-z0-9]+)/i)
  if (m) return wrap(`https://www.loom.com/embed/${m[1]}`)
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/i)
  if (m) return wrap(`https://player.vimeo.com/video/${m[1]}`)
  // Tella
  m = url.match(/tella\.tv\/video\/([a-z0-9-]+)/i)
  if (m) return wrap(`https://www.tella.tv/video/${m[1]}/embed`)
  // Figma
  if (/figma\.com\/(file|proto|design)\//i.test(url))
    return wrap(`https://www.figma.com/embed?embed_host=truheirs&url=${encodeURIComponent(url)}`)
  // Google Docs / Sheets / Slides — switch /edit → /preview
  if (/docs\.google\.com\//i.test(url))
    return wrap(url.replace(/\/edit.*$/, '/preview'))
  // Default → just iframe whatever (works for most embeds)
  return wrap(url)
}

export function SopEditor({ content, onChange, editable = true }: Props) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-[#2eb2ff] underline' } }),
      Underline,
      Youtube.configure({ width: 720, height: 405, nocookie: true, HTMLAttributes: { class: 'w-full aspect-video rounded-lg my-4' } }),
      Placeholder.configure({ placeholder: editable ? "Write your SOP. Type '/' for ideas, or paste any link to embed it." : '' }),
    ],
    editable,
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[400px] px-4 py-4 focus:outline-none prose prose-sm md:prose-base max-w-none w-full prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-a:text-[#2eb2ff] prose-strong:text-foreground prose-img:rounded-lg prose-img:my-4',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain')?.trim()
        if (!text || !/^https?:\/\//.test(text)) return false
        // YouTube → native extension
        if (/(youtube\.com|youtu\.be)/i.test(text)) {
          editor?.commands.setYoutubeVideo({ src: text })
          return true
        }
        const html = urlToEmbedHtml(text)
        if (html) {
          editor?.commands.insertContent(html)
          return true
        }
        return false
      },
    },
  })

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Enter URL')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const uploadImage = async (file: File) => {
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `sops/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('sop-assets').upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('sop-assets').getPublicUrl(path)
      editor.chain().focus().setImage({ src: data.publicUrl }).run()
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' })
    }
  }

  const insertEmbed = () => {
    const url = window.prompt('Paste a URL to embed (YouTube, Loom, Vimeo, Figma, Google Doc, etc.)')
    if (!url) return
    if (/(youtube\.com|youtu\.be)/i.test(url)) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
      return
    }
    const html = urlToEmbedHtml(url)
    if (html) editor.chain().focus().insertContent(html).run()
  }

  const insertCustomEmbed = () => {
    const code = window.prompt('Paste embed/iframe HTML')
    if (!code) return
    editor.chain().focus().insertContent(code).run()
  }

  if (!editable) {
    return <EditorContent editor={editor} />
  }

  const Btn = ({ onClick, active, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-muted transition ${active ? 'bg-muted text-[#ffb500]' : 'text-foreground'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5 sticky top-0 bg-card z-10 rounded-t-lg">
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={setLink} active={editor.isActive('link')} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => fileInputRef.current?.click()} title="Upload image"><ImageIcon className="h-4 w-4" /></Btn>
        <Btn onClick={insertEmbed} title="Embed video / doc by URL"><YoutubeIcon className="h-4 w-4" /></Btn>
        <Btn onClick={insertCustomEmbed} title="Insert custom embed HTML"><Sparkles className="h-4 w-4" /></Btn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadImage(f)
            e.currentTarget.value = ''
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
