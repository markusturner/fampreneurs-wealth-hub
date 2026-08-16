import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'

const PROGRAM_NAMES: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'The Private Estate Accelerator',
  tffm: 'The Family Fortune Mastermind',
}

interface MemberOption {
  user_id: string
  display_name: string
  avatar_url: string | null
}

let cachedProgram: string | null = null
let cachedMembers: MemberOption[] = []

async function loadMembers(program: string): Promise<MemberOption[]> {
  if (cachedProgram === program && cachedMembers.length) return cachedMembers
  const assigned = PROGRAM_NAMES[program]
  let query = supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, program_name')
    .not('display_name', 'is', null)
    .order('display_name')
    .limit(500)
  if (assigned) query = query.ilike('program_name', `%${assigned}%`)
  const { data } = await query
  const rows = (data || [])
    .filter(r => !!r.display_name)
    .map(r => ({ user_id: r.user_id, display_name: r.display_name as string, avatar_url: r.avatar_url }))
  cachedProgram = program
  cachedMembers = rows
  return rows
}

/* ---------- markdown <-> html ---------- */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function markdownToHtml(md: string): string {
  if (!md) return ''
  const lines = md.split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const inline = (t: string) =>
    escapeHtml(t)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const line of lines) {
    const bullet = line.match(/^\s*•\s+(.*)$/)
    const num = line.match(/^\s*\d+\.\s+(.*)$/)
    if (bullet) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul' }
      out.push(`<li><p>${inline(bullet[1])}</p></li>`)
    } else if (num) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol' }
      out.push(`<li><p>${inline(num[1])}</p></li>`)
    } else {
      close()
      out.push(`<p>${line.trim() ? inline(line) : '<br>'}</p>`)
    }
  }
  close()
  return out.join('')
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  const kids = Array.from(el.childNodes).map(nodeToMarkdown).join('')
  switch (el.tagName) {
    case 'STRONG':
    case 'B':
      return kids.trim() ? `**${kids}**` : kids
    case 'EM':
    case 'I':
      return kids.trim() ? `*${kids}*` : kids
    case 'U':
      return kids.trim() ? `__${kids}__` : kids
    case 'BR':
      return '\n'
    case 'P':
      return kids
    default:
      return kids
  }
}

export function htmlToMarkdown(html: string): string {
  const root = document.createElement('div')
  root.innerHTML = html
  const blocks: string[] = []
  Array.from(root.children).forEach(child => {
    const tag = child.tagName
    if (tag === 'UL' || tag === 'OL') {
      Array.from(child.children).forEach((li, i) => {
        const text = nodeToMarkdown(li).trim()
        blocks.push(tag === 'OL' ? `${i + 1}. ${text}` : `• ${text}`)
      })
    } else {
      blocks.push(nodeToMarkdown(child))
    }
  })
  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

/* ---------- component ---------- */

interface Props {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  program?: string
  className?: string
  minHeight?: string
  autoFocus?: boolean
}

export function PostRichEditor({
  value, onChange, placeholder = 'Write something...', program = '', className = '', minHeight = '120px', autoFocus,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const skipSync = useRef(false)
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null)
  const [, force] = useState(0)

  // mention state
  const [members, setMembers] = useState<MemberOption[]>([])
  const [mention, setMention] = useState<{ query: string; from: number; top: number; left: number } | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => { loadMembers(program).then(setMembers) }, [program])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(value),
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `focus:outline-none text-sm leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-0.5`,
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      skipSync.current = true
      onChange(htmlToMarkdown(editor.getHTML()))
    },
  })

  const updateBubble = useCallback(() => {
    if (!editor || !wrapRef.current) return
    const { from, to, empty } = editor.state.selection
    force(n => n + 1)
    if (empty || from === to || !editor.isFocused) { setBubble(null); return }
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    const box = wrapRef.current.getBoundingClientRect()
    setBubble({
      top: start.top - box.top - 44,
      left: Math.max(0, (start.left + end.left) / 2 - box.left - 90),
    })
  }, [editor])

  const updateMention = useCallback(() => {
    if (!editor || !wrapRef.current) { setMention(null); return }
    const { from, empty } = editor.state.selection
    if (!empty) { setMention(null); return }
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 40), from, '\n', '\n')
    const at = textBefore.lastIndexOf('@')
    if (at === -1) { setMention(null); return }
    const between = textBefore.slice(at + 1)
    if (/[\n]/.test(between) || between.length > 30) { setMention(null); return }
    const prev = at === 0 ? ' ' : textBefore[at - 1]
    if (prev && !/\s/.test(prev)) { setMention(null); return }
    const coords = editor.view.coordsAtPos(from)
    const box = wrapRef.current.getBoundingClientRect()
    setMention({ query: between, from: from - between.length - 1, top: coords.bottom - box.top + 6, left: coords.left - box.left })
    setHighlight(0)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const handler = () => { updateBubble(); updateMention() }
    editor.on('selectionUpdate', handler)
    editor.on('transaction', handler)
    editor.on('blur', () => setTimeout(() => { setBubble(null); setMention(null) }, 150))
    return () => {
      editor.off('selectionUpdate', handler)
      editor.off('transaction', handler)
    }
  }, [editor, updateBubble, updateMention])

  // sync external value changes (e.g. clearing after post)
  useEffect(() => {
    if (!editor) return
    if (skipSync.current) { skipSync.current = false; return }
    const current = htmlToMarkdown(editor.getHTML())
    if (current !== value) editor.commands.setContent(markdownToHtml(value))
  }, [editor, value])

  if (!editor) return null

  const filtered = mention
    ? (mention.query
        ? members.filter(m => m.display_name.toLowerCase().includes(mention.query.toLowerCase()))
        : members
      ).slice(0, 6)
    : []

  const applyMention = (m: MemberOption) => {
    if (!mention) return
    editor.chain().focus()
      .insertContentAt({ from: mention.from, to: editor.state.selection.from }, `@${m.display_name} `)
      .run()
    setMention(null)
  }

  const btn = (active: boolean) =>
    `h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
      active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
    }`

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <EditorContent editor={editor} />

      {bubble && (
        <div
          className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover shadow-lg px-1 py-1"
          style={{ top: bubble.top, left: bubble.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button type="button" className={btn(editor.isActive('bold'))} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn(editor.isActive('italic'))} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn(editor.isActive('underline'))} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-3.5 w-3.5" /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button type="button" className={btn(editor.isActive('bulletList'))} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn(editor.isActive('orderedList'))} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {mention && filtered.length > 0 && (
        <div
          className="absolute z-50 w-64 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1"
          style={{ top: mention.top, left: mention.left }}
        >
          {filtered.map((m, i) => (
            <button
              key={m.user_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyMention(m) }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm ${i === highlight ? 'bg-muted' : 'hover:bg-muted/60'}`}
            >
              <Avatar className="h-6 w-6">
                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                <AvatarFallback className="text-[10px]">
                  {m.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{m.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
