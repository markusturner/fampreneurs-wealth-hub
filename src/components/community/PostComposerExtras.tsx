import { useState, useEffect, useRef } from 'react'
import { Smile, Sticker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/integrations/supabase/client'

// Lazy-loaded emoji picker (already in deps)
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react'

interface GifItem { id: string; title: string; url: string; preview: string }

export function EmojiButton({ onPick, className = '' }: { onPick: (emoji: string) => void; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`} aria-label="Insert emoji">
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="p-0 w-auto border-0 shadow-xl">
        <EmojiPicker
          onEmojiClick={(d) => onPick(d.emoji)}
          emojiStyle={EmojiStyle.NATIVE}
          theme={Theme.LIGHT}
          width={320}
          height={380}
          searchPlaceholder="Search emojis"
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function GifButton({ onPick, className = '' }: { onPick: (url: string) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<number | null>(null)

  const search = async (term: string) => {
    setLoading(true)
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/giphy-search?q=${encodeURIComponent(term)}&limit=24`
      const session = (await supabase.auth.getSession()).data.session
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      })
      const json = await res.json()
      setItems(json.items || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!open) return
    if (debounce.current) window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => search(q), 300)
  }, [q, open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`} aria-label="Insert GIF">
          <Sticker className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="p-2 w-[340px] border shadow-xl">
        <Input autoFocus placeholder="Search GIFs..." value={q} onChange={e => setQ(e.target.value)} className="h-8 text-xs mb-2" />
        <div className="grid grid-cols-2 gap-1 max-h-[320px] overflow-y-auto">
          {loading && <div className="col-span-2 text-center text-xs text-muted-foreground py-6">Loading…</div>}
          {!loading && items.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground py-6">No GIFs found</div>}
          {items.map(g => (
            <button key={g.id} type="button" onClick={() => { onPick(g.url); setOpen(false) }} className="rounded overflow-hidden hover:ring-2 hover:ring-primary">
              <img src={g.preview} alt={g.title} className="w-full h-24 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-1">Powered by GIPHY</p>
      </PopoverContent>
    </Popover>
  )
}

interface PollDraftEditorProps {
  question: string
  options: string[]
  onChange: (q: string, opts: string[]) => void
  onRemove: () => void
}

export function PollDraftEditor({ question, options, onChange, onRemove }: PollDraftEditorProps) {
  const setOpt = (i: number, v: string) => {
    const next = [...options]; next[i] = v; onChange(question, next)
  }
  const addOpt = () => { if (options.length < 6) onChange(question, [...options, '']) }
  const removeOpt = (i: number) => onChange(question, options.filter((_, idx) => idx !== i))

  return (
    <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Poll</span>
        <button onClick={onRemove} className="text-xs text-destructive hover:underline">Remove</button>
      </div>
      <Input placeholder="Ask a question..." value={question} onChange={e => onChange(e.target.value, options)} className="h-8 text-sm" />
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input placeholder={`Option ${i + 1}`} value={o} onChange={e => setOpt(i, e.target.value)} className="h-8 text-sm" />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOpt(i)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <Button type="button" variant="ghost" size="sm" onClick={addOpt} className="h-7 text-xs">+ Add option</Button>
      )}
    </div>
  )
}
