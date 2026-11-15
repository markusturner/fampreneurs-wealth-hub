import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { MessageSquare, Phone, Search } from 'lucide-react'
import { analyzeChats, chatCommunities, voiceCallIds, CHAT_COMMUNITIES, type ChatCommunity, type ChatRow } from '@/lib/markus-chat-analytics'

type Row = ChatRow & { conversation_id: string | null; metadata: any }
type Client = { user_id: string; display_name: string | null; email: string | null; communities: ChatCommunity[]; count: number; voiceCalls: number; last: string }
type Convo = { id: string; title: string | null; created_at: string; updated_at: string }
type Msg = { id: string; role: string; content: string; created_at: string; conversation_id: string | null; metadata: any }
type Kind = 'all' | 'text' | 'voice'

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const chip = (active: boolean) => `whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-sidebar bg-sidebar text-sidebar-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/60'}`

// Markus AI text chats and voice calls from every community, including Markus AI members.
// `focusId` opens one client right away (profile id or login id).
export default function ClientMarkusThreads({ focusId }: { focusId?: string | null } = {}) {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [community, setCommunity] = useState<ChatCommunity | 'all'>('all')
  const [kind, setKind] = useState<Kind>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [convos, setConvos] = useState<Convo[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [convo, setConvo] = useState<string | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      const collected: Row[] = []
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from('ai_chat_history').select('user_id, role, content, created_at, conversation_id, metadata').order('created_at', { ascending: false }).range(from, from + 999)
        collected.push(...((data || []) as Row[]))
        if (!data || data.length < 1000) break
      }
      const users = new Map<string, { count: number; last: string; rows: Row[] }>()
      for (const r of collected) {
        const u = users.get(r.user_id)
        if (u) { u.count++; u.rows.push(r) } else users.set(r.user_id, { count: 1, last: r.created_at, rows: [r] })
      }
      const ids = [...users.keys()]
      const profs: any[] = []
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from('profiles').select('user_id, display_name, first_name, last_name, email, program_name').in('user_id', ids.slice(i, i + 200))
        profs.push(...(data || []))
      }
      const pm = new Map(profs.map((p: any) => [p.user_id, p]))
      setClients(ids.map(id => {
        const p = pm.get(id)
        const u = users.get(id)!
        const name = p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || null
        return { user_id: id, display_name: name, email: p?.email ?? null, communities: chatCommunities(p?.program_name), count: u.count, voiceCalls: voiceCallIds(u.rows).size, last: u.last }
      }))
      setRows(collected)
      setLoading(false)
    })()
  }, [])

  // Open a client passed in from the client details popup.
  useEffect(() => {
    if (!focusId || loading) return
    if (clients.some(c => c.user_id === focusId)) { setSelected(focusId); return }
    void supabase.from('profiles').select('user_id').eq('id', focusId).maybeSingle().then(({ data }) => { if (data?.user_id) setSelected(data.user_id) })
  }, [focusId, loading, clients])

  useEffect(() => {
    if (!selected) return
    setConvo('all'); setMessages([]); setConvos([])
    ;(async () => {
      const [{ data: c }, all] = await Promise.all([
        supabase.from('chat_conversations').select('id, title, created_at, updated_at').eq('user_id', selected).order('updated_at', { ascending: false }),
        (async () => {
          const out: Msg[] = []
          for (let from = 0; ; from += 1000) {
            const { data } = await supabase.from('ai_chat_history').select('id, role, content, created_at, conversation_id, metadata').eq('user_id', selected).order('created_at', { ascending: true }).range(from, from + 999)
            out.push(...((data || []) as Msg[]))
            if (!data || data.length < 1000) break
          }
          return out
        })(),
      ])
      setConvos((c || []) as Convo[]); setMessages(all)
    })()
  }, [selected])

  const communityOf = useMemo(() => new Map(clients.map(c => [c.user_id, c.communities])), [clients])
  const allVoice = useMemo(() => voiceCallIds(rows), [rows])
  const scopedRows = useMemo(() => rows.filter(r => {
    if (community !== 'all' && !(communityOf.get(r.user_id) || []).includes(community)) return false
    const isVoice = !!r.conversation_id && allVoice.has(r.conversation_id)
    return kind === 'all' || (kind === 'voice' ? isVoice : !isVoice)
  }), [rows, community, kind, communityOf, allVoice])
  const communityCounts = useMemo(() => {
    const m = new Map<ChatCommunity, number>()
    for (const c of clients) for (const k of c.communities) m.set(k, (m.get(k) || 0) + 1)
    return m
  }, [clients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter(c =>
      (!q || (c.display_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)) &&
      (community === 'all' || c.communities.includes(community)) &&
      (kind !== 'voice' || c.voiceCalls > 0))
  }, [clients, search, community, kind])

  const voiceThreads = useMemo(() => voiceCallIds(messages), [messages])
  const threadList = convos.filter(c => kind === 'all' || (kind === 'voice' ? voiceThreads.has(c.id) : !voiceThreads.has(c.id)))
  const shown = (convo === 'all' ? messages : messages.filter(m => m.conversation_id === convo))
    .filter(m => kind === 'all' || (kind === 'voice' ? !!m.conversation_id && voiceThreads.has(m.conversation_id) : !(m.conversation_id && voiceThreads.has(m.conversation_id))))
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, convo, kind])
  const stats = useMemo(() => analyzeChats(scopedRows), [scopedRows])
  const voiceCount = useMemo(() => voiceCallIds(scopedRows).size, [scopedRows])
  const nameOf = (id: string) => { const c = clients.find(x => x.user_id === id); return c?.display_name || c?.email || 'Unknown client' }
  const maxWeek = Math.max(1, ...stats.weeks.map(w => w.count))
  const client = clients.find(c => c.user_id === selected)

  return (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <button className={chip(community === 'all')} onClick={() => setCommunity('all')}>All communities ({clients.length})</button>
      {CHAT_COMMUNITIES.filter(c => communityCounts.get(c) || c === 'Markus AI').map(c => (
        <button key={c} className={chip(community === c)} onClick={() => setCommunity(c)}>{c} ({communityCounts.get(c) || 0})</button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" />
      {([['all', 'Chats and calls'], ['text', 'Text chats'], ['voice', 'Voice calls']] as const).map(([k, l]) => (
        <button key={k} className={chip(kind === k)} onClick={() => setKind(k)}>{k === 'voice' && <Phone className="mr-1 inline h-3 w-3" />}{l}</button>
      ))}
    </div>
    {!loading && (
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 lg:col-span-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {([['Client questions', stats.totalQuestions], ['Clients using Markus', stats.totalClients], ['Voice calls', voiceCount], ['Active last 7 days', stats.active7], ['Active last 30 days', stats.active30], ['Questions per client', stats.avgPerClient.toFixed(1)], ['Busiest day', stats.busiestDay]] as const).map(([l, v]) => (
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
          {stats.topUsers.length === 0 ? <p className="text-xs text-muted-foreground">No activity here yet.</p> : stats.topUsers.map(([id, n]) => (
            <button key={id} onClick={() => setSelected(id)} className="flex w-full justify-between py-1 text-left text-xs hover:underline"><span className="truncate">{nameOf(id)}</span><span className="text-muted-foreground">{n} questions</span></button>
          ))}
        </div>
      </div>
    )}
    <div className="grid min-h-[70vh] gap-3 md:grid-cols-[260px_220px_1fr]">
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="relative border-b p-2"><Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients" className="h-8 pl-7 text-xs" /></div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? <p className="p-3 text-xs text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="p-3 text-xs text-muted-foreground">{community === 'Markus AI' ? 'No Markus AI members have chatted yet.' : 'No chats yet.'}</p> :
            filtered.map(c => (
              <button key={c.user_id} onClick={() => setSelected(c.user_id)} className={`w-full border-b px-3 py-2 text-left text-xs ${selected === c.user_id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center gap-1.5"><span className="truncate font-medium">{c.display_name || c.email || 'Unknown client'}</span></div>
                <div className="mt-1 flex flex-wrap gap-1">{c.communities.map(k => <span key={k} className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">{k}</span>)}</div>
                <div className="mt-1 text-muted-foreground">{c.count} messages{c.voiceCalls ? ` · ${c.voiceCalls} voice call${c.voiceCalls === 1 ? '' : 's'}` : ''} · last {fmt(c.last)}</div>
              </button>
            ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="border-b p-2 text-xs font-semibold">Threads</div>
        {selected ? (
          <div className="max-h-[70vh] overflow-y-auto">
            <button onClick={() => setConvo('all')} className={`w-full border-b px-3 py-2 text-left text-xs ${convo === 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>All {kind === 'voice' ? 'voice calls' : kind === 'text' ? 'text chats' : 'messages'}</button>
            {threadList.map(c => (
              <button key={c.id} onClick={() => setConvo(c.id)} className={`w-full border-b px-3 py-2 text-left text-xs ${convo === c.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center gap-1.5">{voiceThreads.has(c.id) ? <Phone className="h-3 w-3 shrink-0 text-accent" aria-label="Voice call" /> : <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Text chat" />}<span className="truncate font-medium">{c.title || 'Untitled chat'}</span></div>
                <div className="text-muted-foreground">{fmt(c.updated_at)}</div>
              </button>
            ))}
          </div>
        ) : <p className="p-3 text-xs text-muted-foreground">Pick a client.</p>}
      </div>
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-2 text-xs font-semibold"><MessageSquare className="h-3.5 w-3.5" />{client ? (client.display_name || client.email) : 'Conversation'}{client && <span className="font-normal text-muted-foreground">· {client.communities.join(', ')}</span>}</div>
        <div ref={scrollRef} className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
          {!selected ? <p className="text-xs text-muted-foreground">Pick a client to read their Markus AI chats and voice calls from the start.</p> :
            shown.length === 0 ? <p className="text-xs text-muted-foreground">No messages.</p> :
            shown.map(m => {
              const voice = !!m.conversation_id && voiceThreads.has(m.conversation_id)
              return (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-sidebar text-sidebar-foreground' : 'bg-muted'}`}>
                    <div className="mb-1 flex items-center gap-1 text-[10px] opacity-70">{voice && <Phone className="h-2.5 w-2.5" />}{m.role === 'user' ? 'Client' : 'Markus AI'}{voice ? ' · Voice call' : ''} · {fmt(m.created_at)}</div>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
    </div>
  )
}
