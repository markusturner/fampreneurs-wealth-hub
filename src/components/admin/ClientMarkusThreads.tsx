import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { MessageSquare, Search } from 'lucide-react'
import { analyzeChats, type ChatRow } from '@/lib/markus-chat-analytics'

type Client = { user_id: string; display_name: string | null; email: string | null }
type Convo = { id: string; title: string | null; created_at: string; updated_at: string }
type Msg = { id: string; role: string; content: string; created_at: string; conversation_id: string | null }

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ClientMarkusThreads() {
  const [clients, setClients] = useState<(Client & { count: number; last: string })[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [convos, setConvos] = useState<Convo[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [convo, setConvo] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ChatRow[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      const users = new Map<string, { count: number; last: string }>()
      const collected: ChatRow[] = []
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from('ai_chat_history').select('user_id, role, content, created_at').order('created_at', { ascending: false }).range(from, from + 999)
        for (const r of data || []) {
          collected.push(r as ChatRow)
          const u = users.get(r.user_id)
          if (u) u.count++
          else users.set(r.user_id, { count: 1, last: r.created_at })
        }
        if (!data || data.length < 1000) break
      }
      const ids = [...users.keys()]
      const { data: profs } = ids.length ? await supabase.from('profiles').select('user_id, display_name, email').in('user_id', ids) : { data: [] }
      const pm = new Map((profs || []).map((p: any) => [p.user_id, p]))
      setClients(ids.map(id => ({ user_id: id, display_name: pm.get(id)?.display_name ?? null, email: pm.get(id)?.email ?? null, ...users.get(id)! })))
      setRows(collected)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!selected) return
    setConvo('all'); setMessages([]); setConvos([])
    ;(async () => {
      const [{ data: c }, all] = await Promise.all([
        supabase.from('chat_conversations').select('id, title, created_at, updated_at').eq('user_id', selected).order('updated_at', { ascending: false }),
        (async () => {
          const out: Msg[] = []
          for (let from = 0; ; from += 1000) {
            const { data } = await supabase.from('ai_chat_history').select('id, role, content, created_at, conversation_id').eq('user_id', selected).order('created_at', { ascending: true }).range(from, from + 999)
            out.push(...((data || []) as Msg[]))
            if (!data || data.length < 1000) break
          }
          return out
        })(),
      ])
      setConvos((c || []) as Convo[]); setMessages(all)
    })()
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter(c => !q || (c.display_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [clients, search])
  const shown = convo === 'all' ? messages : messages.filter(m => m.conversation_id === convo)
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, convo])
  const stats = useMemo(() => analyzeChats(rows), [rows])
  const nameOf = (id: string) => { const c = clients.find(x => x.user_id === id); return c?.display_name || c?.email || 'Unknown client' }
  const maxWeek = Math.max(1, ...stats.weeks.map(w => w.count))
  const client = clients.find(c => c.user_id === selected)

  return (
    <div className="space-y-3">
    {!loading && (
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 lg:col-span-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([['Client questions', stats.totalQuestions], ['Clients using chat', stats.totalClients], ['Active last 7 days', stats.active7], ['Active last 30 days', stats.active30], ['Questions per client', stats.avgPerClient.toFixed(1)], ['Busiest day', stats.busiestDay]] as const).map(([l, v]) => (
              <div key={l}><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-lg font-bold">{v}</div></div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-semibold">Top 5 problems clients are solving</div>
          {stats.topTopics.length === 0 ? <p className="text-xs text-muted-foreground">Not enough chats yet.</p> : stats.topTopics.map((t, i) => (
            <div key={t.label} className="mb-2">
              <div className="flex justify-between text-xs"><span>{i + 1}. {t.label}</span><span className="text-muted-foreground">{t.count} ({Math.round(t.share * 100)}%)</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-secondary" style={{ width: `${Math.max(4, t.share * 100)}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-semibold">Questions per week</div>
          <div className="flex h-28 items-end gap-1.5">
            {stats.weeks.map(w => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{w.count}</span>
                <div className="w-full rounded-t bg-sidebar" style={{ height: `${(w.count / maxWeek) * 80}px` }} />
                <span className="text-[9px] text-muted-foreground">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-semibold">Most active clients</div>
          {stats.topUsers.map(([id, n]) => (
            <button key={id} onClick={() => setSelected(id)} className="flex w-full justify-between py-1 text-left text-xs hover:underline"><span className="truncate">{nameOf(id)}</span><span className="text-muted-foreground">{n} questions</span></button>
          ))}
        </div>
      </div>
    )}
    <div className="grid min-h-[70vh] gap-3 md:grid-cols-[260px_220px_1fr]">
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="relative border-b p-2"><Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients" className="h-8 pl-7 text-xs" /></div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? <p className="p-3 text-xs text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No chats yet.</p> :
            filtered.map(c => (
              <button key={c.user_id} onClick={() => setSelected(c.user_id)} className={`w-full border-b px-3 py-2 text-left text-xs ${selected === c.user_id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <div className="truncate font-medium">{c.display_name || c.email || 'Unknown client'}</div>
                <div className="text-muted-foreground">{c.count} messages · last {fmt(c.last)}</div>
              </button>
            ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="border-b p-2 text-xs font-semibold">Threads</div>
        {selected ? (
          <div className="max-h-[70vh] overflow-y-auto">
            <button onClick={() => setConvo('all')} className={`w-full border-b px-3 py-2 text-left text-xs ${convo === 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>All messages ({messages.length})</button>
            {convos.map(c => (
              <button key={c.id} onClick={() => setConvo(c.id)} className={`w-full border-b px-3 py-2 text-left text-xs ${convo === c.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <div className="truncate font-medium">{c.title || 'Untitled chat'}</div>
                <div className="text-muted-foreground">{fmt(c.updated_at)}</div>
              </button>
            ))}
          </div>
        ) : <p className="p-3 text-xs text-muted-foreground">Pick a client.</p>}
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-2 text-xs font-semibold"><MessageSquare className="h-3.5 w-3.5" />{client ? (client.display_name || client.email) : 'Conversation'}</div>
        <div ref={scrollRef} className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
          {!selected ? <p className="text-xs text-muted-foreground">Pick a client to read their Markus AI chats from the start.</p> :
            shown.length === 0 ? <p className="text-xs text-muted-foreground">No messages.</p> :
            shown.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-sidebar text-sidebar-foreground' : 'bg-muted'}`}>
                  <div className="mb-1 text-[10px] opacity-70">{m.role === 'user' ? 'Client' : 'Markus AI'} · {fmt(m.created_at)}</div>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
    </div>
  )
}
