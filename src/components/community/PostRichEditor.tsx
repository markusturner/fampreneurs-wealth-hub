import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { loadMentionMembers, mentionOptions, type MemberOption } from '@/lib/community-mentions'
import { extraHeadingPositions } from '@/lib/community-heading-limit'

const SingleHeading = Extension.create({
  name: 'singleHeading',
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction: (transactions, _oldState, state) => {
        if (!transactions.some(transaction => transaction.docChanged)) return null
        const positions: number[] = []
        state.doc.descendants((node, pos) => { if (node.type.name === 'heading') positions.push(pos) })
        const extras = extraHeadingPositions(positions)
        if (!extras.length) return null
        const transaction = state.tr
        extras.forEach(pos => transaction.setNodeMarkup(pos, state.schema.nodes.paragraph))
        return transaction
      },
    })]
  },
})

/* ---------- markdown <-> html ---------- */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function markdownToHtml(md: string): string {
  if (!md) return ''
  const lines = md.split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let hasHeading = false
  const inline = (t: string) =>
    escapeHtml(t)
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')

  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const line of lines) {
    const bullet = line.match(/^\s*•\s+(.*)$/)
    const num = line.match(/^\s*\d+\.\s+(.*)$/)
    const heading = line.match(/^##\s+(.*)$/)
    if (heading && !hasHeading) {
      hasHeading = true
      close()
      out.push(`<h2>${inline(heading[1])}</h2>`)
    } else if (heading) {
      close()
      out.push(`<p>${inline(heading[1])}</p>`)
    } else if (bullet) {
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
    case 'H2':
      return `## ${kids}`
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
  compact?: boolean
}

export function PostRichEditor({
  value, onChange, placeholder = 'Write something...', program = '', className = '', minHeight = '120px', autoFocus, compact = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null)
  const [, force] = useState(0)

  // mention state
  const [members, setMembers] = useState<MemberOption[]>([])
  const [mention, setMention] = useState<{ query: string; from: number; top: number; left: number } | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    let active = true
    setMembers([])
    loadMentionMembers(program).then(rows => { if (active) setMembers(rows) }).catch(() => { if (active) setMembers([]) })
    return () => { active = false }
  }, [program])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2] }, codeBlock: false, blockquote: false, horizontalRule: false }),
      SingleHeading,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(value),
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `focus:outline-none text-sm leading-relaxed break-words [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-0.5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-secondary [&_h2]:leading-snug [&_h2]:my-1`,
        'aria-label': compact ? 'Community message' : 'Edit message',
        role: 'textbox',
        'aria-multiline': 'true',
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
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
    const current = htmlToMarkdown(editor.getHTML())
    if (current !== value || (!value && !editor.isEmpty)) {
      editor.commands.setContent(markdownToHtml(value), { emitUpdate: false })
      if (!value) {
        editor.commands.unsetAllMarks()
        setBubble(null)
        setMention(null)
      }
    }
  }, [editor, value])

  if (!editor) return null

  const filtered = mention ? mentionOptions(members, mention.query) : []
  const headingActive = editor.isActive('heading', { level: 2 })
  let hasHeading = false
  editor.state.doc.descendants(node => { if (node.type.name === 'heading') hasHeading = true })

  const toggleSingleHeading = () => {
    if (hasHeading) {
      editor.chain().focus().command(({ tr, state }) => {
        let done = false
        state.doc.descendants((node, pos) => {
          if (!done && node.type.name === 'heading') {
            let headingPos = pos
            const prev = headingPos > 0 ? state.doc.nodeAt(headingPos - 1) : null
            if (prev && prev.type.name === 'paragraph' && prev.content.size === 0) {
              tr.delete(headingPos - prev.nodeSize, headingPos)
              headingPos -= prev.nodeSize
            }
            tr.setNodeMarkup(headingPos, state.schema.nodes.paragraph)
            const after = headingPos + node.nodeSize
            const next = state.doc.nodeAt(after)
            if (next && next.type.name === 'paragraph' && next.content.size === 0) {
              tr.delete(after, after + next.nodeSize)
            }
            done = true
          }
        })
        return done
      }).run()
    } else {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    }
  }

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
      <div className={compact ? 'flex items-start gap-1' : ''}>
        <EditorContent editor={editor} className={compact ? 'min-w-0 flex-1 max-h-32 overflow-y-auto px-1 py-2' : ''} />
        <Button type="button" variant="ghost" size="icon" title={hasHeading && !headingActive ? 'One heading per message' : 'Heading'} aria-label="Heading" aria-pressed={headingActive} disabled={hasHeading && !headingActive} className={`h-7 w-7 rounded-md shrink-0 transition-colors ${headingActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${compact ? 'mt-1.5' : 'mt-1'}`} onPointerDown={e => e.preventDefault()} onClick={toggleSingleHeading}><Heading2 className="h-3.5 w-3.5" /></Button>
      </div>

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
          role="listbox" aria-label="Mention members"
          className="absolute bottom-full left-0 mb-1 z-50 w-64 max-w-[calc(100vw-2rem)] max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1"
        >
          {filtered.map((m, i) => (
            <Button variant="ghost" role="option" aria-selected={i === highlight}
              key={m.user_id}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => applyMention(m)}
              className={`h-auto rounded-none justify-start w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm ${i === highlight ? 'bg-muted' : 'hover:bg-muted/60'}`}
            >
              <Avatar className="h-6 w-6">
                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                <AvatarFallback className="text-[10px]">
                  {m.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{m.user_id === 'everyone' ? '@everyone' : m.display_name}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
