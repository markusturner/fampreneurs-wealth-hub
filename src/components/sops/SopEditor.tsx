import { useRef, useEffect } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Link as LinkIcon,
  Image as ImageIcon, Minus, Youtube as YoutubeIcon, Heading1, Heading2,
  Heading3, Heading4, Code2, Sparkles, Paperclip, Highlighter, Table as TableIcon,
  Lightbulb, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  IndentIncrease, IndentDecrease, ListChecks, Subscript as SubIcon,
  Superscript as SupIcon, Undo2, Redo2, RemoveFormatting, Palette,
} from 'lucide-react'

// Custom indent extension: margin-left in 24px steps on paragraphs and headings.
const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indent: {
          default: 0,
          renderHTML: (attrs: any) => attrs.indent ? { style: `margin-left: ${attrs.indent * 24}px` } : {},
          parseHTML: (el: HTMLElement) => {
            const ml = parseInt(el.style.marginLeft || '0', 10)
            return ml ? Math.round(ml / 24) : 0
          },
        },
      },
    }]
  },
  addCommands() {
    const update = (delta: number) => ({ tr, state, dispatch }: any) => {
      const { from, to } = state.selection
      let changed = false
      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        if (['paragraph', 'heading'].includes(node.type.name)) {
          const cur = node.attrs.indent || 0
          const next = Math.max(0, Math.min(8, cur + delta))
          if (next !== cur) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
            changed = true
          }
        }
      })
      if (changed && dispatch) dispatch(tr)
      return changed
    }
    return {
      indent: () => update(1) as any,
      outdent: () => update(-1) as any,
    } as any
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) ? false : (this.editor.commands as any).indent(),
      'Shift-Tab': () => (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) ? false : (this.editor.commands as any).outdent(),
    }
  },
})

interface Props {
  content: string
  onChange: (html: string) => void
  editable?: boolean
  /** Notion-style: no outer card border, transparent background, minimal toolbar */
  bare?: boolean
}

// Convert embed-like URLs (Loom, Vimeo, Tella, Figma, Google Docs, generic) → iframe HTML
function urlToEmbedHtml(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null
  const wrap = (src: string) =>
    `<div class="my-4 aspect-video w-full overflow-hidden rounded-lg border border-border"><iframe src="${src}" loading="lazy" allow="autoplay; fullscreen; clipboard-write" allowfullscreen class="w-full h-full"></iframe></div>`

  let m = url.match(/loom\.com\/share\/([a-z0-9]+)/i)
  if (m) return wrap(`https://www.loom.com/embed/${m[1]}`)
  m = url.match(/vimeo\.com\/(\d+)/i)
  if (m) return wrap(`https://player.vimeo.com/video/${m[1]}`)
  m = url.match(/tella\.tv\/video\/([a-z0-9-]+)/i)
  if (m) return wrap(`https://www.tella.tv/video/${m[1]}/embed`)
  if (/figma\.com\/(file|proto|design)\//i.test(url))
    return wrap(`https://www.figma.com/embed?embed_host=truheirs&url=${encodeURIComponent(url)}`)
  if (/docs\.google\.com\//i.test(url))
    return wrap(url.replace(/\/edit.*$/, '/preview'))
  return wrap(url)
}

const HEADING_COLORS = {
  1: 'hsl(120 100% 50%)',
  2: 'hsl(187 100% 55%)',
  3: 'hsl(0 0% 100%)',
  4: 'hsl(0 0% 100%)',
} as const

type HeadingLevel = keyof typeof HEADING_COLORS

function recolorSelectedHeadings(editor: any, level: HeadingLevel) {
  const { state, view } = editor
  const { doc, selection, schema } = state
  const textStyle = schema.marks.textStyle
  if (!textStyle) return

  const ranges: Array<{ from: number; to: number }> = []
  if (selection.empty) {
    const pos = selection.$from.before(selection.$from.depth)
    const node = selection.$from.parent
    if (node.type.name === 'heading' && node.attrs.level === level && node.content.size > 0) {
      ranges.push({ from: pos + 1, to: pos + node.nodeSize - 1 })
    }
  } else {
    doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
      if (node.type.name === 'heading' && node.attrs.level === level && node.content.size > 0) {
        ranges.push({ from: pos + 1, to: pos + node.nodeSize - 1 })
        return false
      }
      return true
    })
  }

  if (!ranges.length) return
  const mark = textStyle.create({ color: HEADING_COLORS[level] })
  let tr = state.tr
  ranges.forEach(({ from, to }) => {
    tr = tr.removeMark(from, to, textStyle).addMark(from, to, mark)
  })
  view.dispatch(tr)
}

export function SopEditor({ content, onChange, editable = true, bare = false }: Props) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: true,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, link: false, underline: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-[#2eb2ff] underline' } }),
      Underline,
      Highlight.configure({ multicolor: false, HTMLAttributes: { class: 'bg-[#ffb500]/40 px-1 rounded' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'sop-table w-full border-collapse my-4' } }),
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: 'border border-border bg-muted/60 px-3 py-2 text-left font-semibold' } }),
      TableCell.configure({ HTMLAttributes: { class: 'border border-border px-3 py-2 align-top' } }),
      Youtube.configure({ width: 720, height: 405, nocookie: true, HTMLAttributes: { class: 'w-full aspect-video rounded-lg my-4' } }),
      TextStyle,
      Color,
      FontFamily,
      Subscript,
      Superscript,
      TaskList.configure({ HTMLAttributes: { class: 'not-prose space-y-1 my-2' } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: 'flex gap-2 items-start' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
      Indent,
      Placeholder.configure({ placeholder: editable ? "Write your SOP. Type '/' for ideas, or paste any link to embed it." : '' }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `${bare ? 'min-h-[300px] px-0 py-2' : 'min-h-[400px] px-4 py-4'} focus:outline-none prose prose-sm md:prose-base max-w-none w-full prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-a:text-[#2eb2ff] prose-strong:text-foreground prose-img:rounded-lg prose-img:my-4`,
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain')?.trim() || ''
        const html = event.clipboardData?.getData('text/html') || ''
        // URL-only paste → convert to embed
        if (!html && text && /^https?:\/\/\S+$/.test(text)) {
          if (/(youtube\.com|youtu\.be)/i.test(text)) {
            editor?.commands.setYoutubeVideo({ src: text })
            return true
          }
          const out = urlToEmbedHtml(text)
          if (out) {
            editor?.commands.insertContent(out)
            return true
          }
        }
        // HTML paste → strip font-family / color / background so content inherits app theme
        if (html) {
          try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            doc.querySelectorAll('font').forEach((el) => {
              el.removeAttribute('color')
              el.removeAttribute('face')
            })
            doc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
              const style = el.getAttribute('style') || ''
              const cleaned = style
                .split(';')
                .map((s) => s.trim())
                .filter((s) => s && !/^(color|background(-color)?|font-family|font|-webkit-text-fill-color)\s*:/i.test(s))
                .join('; ')
              if (cleaned) el.setAttribute('style', cleaned)
              else el.removeAttribute('style')
            })
            doc.querySelectorAll('[color]').forEach((el) => el.removeAttribute('color'))
            editor?.commands.insertContent(doc.body.innerHTML)
            return true
          } catch {
            return false
          }
        }
        return false
      },
    },
  })

  // Sync external content into editor when it changes (e.g. after async load)
  useEffect(() => {
    if (!editor) return
    const incoming = content || ''
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [content, editor])

  // Keep editable flag in sync
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable)
  }, [editable, editor])

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Enter URL')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const insertCallout = () => {
    const html = `<div class="sop-callout my-4 rounded-lg border-l-4 border-[#ffb500] bg-[#ffb500]/10 px-4 py-3"><p><strong>💡 Highlight:</strong> Type your important note here.</p></div>`
    editor.chain().focus().insertContent(html).run()
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
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

  const uploadDocument = async (file: File) => {
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `sops/docs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const { error } = await supabase.storage.from('sop-assets').upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('sop-assets').getPublicUrl(path)
      const url = data.publicUrl
      const sizeKb = Math.max(1, Math.round(file.size / 1024))
      const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

      let html = ''
      if (ext === 'pdf') {
        html =
          `<div class="my-4 rounded-lg border border-border overflow-hidden bg-muted/30">` +
            `<div class="aspect-[4/5] w-full"><iframe src="${url}#toolbar=1" loading="lazy" class="w-full h-full" title="${safeName}"></iframe></div>` +
            `<div class="flex items-center justify-between gap-2 px-3 py-2 text-xs border-t border-border">` +
              `<span class="truncate">📄 ${safeName} · ${sizeLabel}</span>` +
              `<a href="${url}" target="_blank" rel="noopener" class="text-[#2eb2ff] underline">Open</a>` +
            `</div>` +
          `</div>`
      } else {
        const icon = ['doc','docx'].includes(ext) ? '📝' : ['xls','xlsx','csv'].includes(ext) ? '📊' : ['ppt','pptx','key'].includes(ext) ? '📽️' : '📎'
        html =
          `<div class="my-3 not-prose">` +
            `<a href="${url}" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-lg border border-border bg-muted/30 hover:bg-muted px-3 py-3 no-underline">` +
              `<span class="text-2xl">${icon}</span>` +
              `<span class="flex-1 min-w-0">` +
                `<span class="block font-medium text-foreground truncate">${safeName}</span>` +
                `<span class="block text-xs text-muted-foreground">${ext.toUpperCase()} · ${sizeLabel} · Open document</span>` +
              `</span>` +
            `</a>` +
          `</div>`
      }
      editor.chain().focus().insertContent(html).run()
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

  const applyHeading = (level: HeadingLevel) => {
    const wasHeading = editor.isActive('heading', { level })
    editor.chain().focus().toggleHeading({ level }).run()
    if (!wasHeading) {
      editor.chain().focus().setColor(HEADING_COLORS[level]).run()
      recolorSelectedHeadings(editor, level)
    }
  }

  if (!editable) {
    return <EditorContent editor={editor} />
  }

  const Btn = ({ onClick, active, children, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-muted transition ${active ? 'bg-muted text-[#ffb500]' : 'text-foreground'}`}
    >
      {children}
    </button>
  )

  return (
    <div className={bare ? '' : 'border border-border rounded-lg bg-card'}>
      <div className={`flex flex-wrap items-center gap-0.5 ${bare ? 'border border-border rounded-lg bg-card/80 backdrop-blur shadow-sm px-2 py-1.5 sticky top-12 z-10 mb-2' : 'border-b border-border px-2 py-1.5 sticky top-0 bg-card z-10 rounded-t-lg'}`}>

        <Btn onClick={() => applyHeading(1)} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => applyHeading(2)} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => applyHeading(3)} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 className="h-4 w-4" /></Btn>
        <Btn onClick={() => applyHeading(4)} active={editor.isActive('heading', { level: 4 })} title="Heading 4"><Heading4 className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript"><SubIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript"><SupIcon className="h-4 w-4" /></Btn>
        <label className="relative p-2 rounded hover:bg-muted transition cursor-pointer text-foreground" title="Text color" onMouseDown={(e) => e.preventDefault()}>
          <Palette className="h-4 w-4" />
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          />
        </label>
        <Btn onClick={() => editor.chain().focus().unsetColor().unsetMark('highlight').unsetAllMarks().run()} title="Clear formatting"><RemoveFormatting className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify className="h-4 w-4" /></Btn>
        <Btn onClick={() => (editor.chain().focus() as any).outdent().run()} title="Decrease indent (Shift+Tab)"><IndentDecrease className="h-4 w-4" /></Btn>
        <Btn onClick={() => (editor.chain().focus() as any).indent().run()} title="Increase indent (Tab)"><IndentIncrease className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><ListChecks className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="h-4 w-4" /></Btn>
        <Btn onClick={insertTable} active={editor.isActive('table')} title="Insert table"><TableIcon className="h-4 w-4" /></Btn>
        <Btn onClick={insertCallout} title="Insert highlight box"><Lightbulb className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-border mx-1" />
        <Btn onClick={setLink} active={editor.isActive('link')} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => fileInputRef.current?.click()} title="Upload image"><ImageIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => docInputRef.current?.click()} title="Upload document (PDF, Word, Excel, etc.)"><Paperclip className="h-4 w-4" /></Btn>
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
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.key,.txt,.md,.zip,.rtf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) uploadDocument(f)
            e.currentTarget.value = ''
          }}
        />

        {/* Contextual table controls */}
        {editor.isActive('table') && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row">+Row</Btn>
            <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column">+Col</Btn>
            <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">−Row</Btn>
            <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">−Col</Btn>
            <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">×</Btn>
          </>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
