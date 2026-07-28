import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'

const PROGRAM_NAMES: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Family Fortune Mastermind',
}

interface MemberOption {
  user_id: string
  display_name: string
  avatar_url: string | null
}

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string
  onChange: (val: string) => void
  program?: string
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
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
  const rows = (data || []).filter(r => !!r.display_name).map(r => ({
    user_id: r.user_id, display_name: r.display_name as string, avatar_url: r.avatar_url,
  }))
  cachedProgram = program
  cachedMembers = rows
  return rows
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onChange, program = '', onKeyDown, onKeyDownExtra, ...rest }, ref
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement)

  const [members, setMembers] = useState<MemberOption[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [triggerStart, setTriggerStart] = useState<number | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => { loadMembers(program).then(setMembers) }, [program])

  const filtered = query
    ? members.filter(m => m.display_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : members.slice(0, 6)

  const detect = useCallback((val: string, cursor: number) => {
    const upToCursor = val.slice(0, cursor)
    const atIdx = upToCursor.lastIndexOf('@')
    if (atIdx === -1) { setOpen(false); return }
    const between = upToCursor.slice(atIdx + 1)
    // Cancel if newline or too long
    if (/\n/.test(between) || between.length > 30) { setOpen(false); return }
    // Must be at start or after whitespace
    const prevChar = atIdx === 0 ? ' ' : upToCursor[atIdx - 1]
    if (prevChar && !/\s/.test(prevChar)) { setOpen(false); return }
    setTriggerStart(atIdx)
    setQuery(between)
    setHighlight(0)
    setOpen(true)
  }, [])

  const applyMention = (m: MemberOption) => {
    if (triggerStart == null) return
    const el = textareaRef.current
    const cursor = el?.selectionStart ?? value.length
    const before = value.slice(0, triggerStart)
    const after = value.slice(cursor)
    const insert = `@${m.display_name} `
    const next = before + insert + after
    onChange(next)
    setOpen(false)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = (before + insert).length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="relative w-full">
      <Textarea
        {...rest}
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          detect(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        onKeyDown={(e) => {
          if (open && filtered.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % filtered.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h - 1 + filtered.length) % filtered.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filtered[highlight]); return }
            if (e.key === 'Escape') { setOpen(false); return }
          }
          onKeyDown?.(e)
          onKeyDownExtra?.(e)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1">
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
})
