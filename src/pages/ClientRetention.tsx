import { useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet-async"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useUserRole } from "@/hooks/useUserRole"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AlertTriangle, TrendingDown, TrendingUp, Heart, Loader2, Sparkles, Send, RefreshCw, StickyNote, Save } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, BarChart, Bar, Legend } from "recharts"

type Status = "at_risk" | "slipping" | "stable" | "expansion_ready"

interface ClientScore {
  user_id: string
  full_name: string
  email: string
  program: string | null
  score: number
  status: Status
  signals: { label: string; severity?: string }[]
  arr_value: number
  last_active_at: string | null
  linked_users?: { user_id: string; full_name: string }[]
  draft?: string
}

const CLIENT_RETENTION_CACHE_KEY = "client_retention_cache_v5"

const STATUS_META: Record<Status, { label: string; color: string; bg: string; ring: string }> = {
  at_risk: { label: "At Risk", color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" },
  slipping: { label: "Slipping", color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" },
  stable: { label: "Stable", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  expansion_ready: { label: "Expansion Ready", color: "text-purple-700", bg: "bg-purple-50", ring: "ring-purple-200" },
}

export default function ClientRetention() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin, isLoading: roleLoading } = useUserRole()
  const { isOwner, isLoading: ownerLoading } = useOwnerRole(user?.id ?? null)

  // Hydrate synchronously from localStorage so the page renders instantly on mount
  const cached = (() => {
    try {
      const raw = localStorage.getItem(CLIENT_RETENTION_CACHE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      const list: ClientScore[] = parsed?.clients ?? []
      if (!Array.isArray(list) || list.length === 0) return null
      const firstAtRisk = list.find((c) => c.status === "at_risk") ?? list[0]
      return { list, selectedId: firstAtRisk?.user_id ?? null }
    } catch { return null }
  })()

  const [loading, setLoading] = useState(!cached)
  const [clients, setClients] = useState<ClientScore[]>(cached?.list ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(cached?.selectedId ?? null)
  const [trend, setTrend] = useState<{ day: string; avg: number }[]>([])
  const [draft, setDraft] = useState<string>("")
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [autopilot, setAutopilot] = useState(false)
  const [notesMap, setNotesMap] = useState<Record<string, { note: string; status_override: Status | null }>>({})
  const [noteDraft, setNoteDraft] = useState<string>("")
  const [statusDraft, setStatusDraft] = useState<Status | "auto">("auto")
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (!user) return
    if (roleLoading || ownerLoading) return
    if (!isAdmin && !isOwner) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, isAdmin, isOwner, roleLoading, ownerLoading, navigate])

  const applyClients = (list: ClientScore[]) => {
    setClients(list)
    setSelectedId((prev) => {
      if (prev && list.some((c) => c.user_id === prev)) return prev
      const firstAtRisk = list.find((c) => c.status === "at_risk") ?? list[0]
      return firstAtRisk?.user_id ?? null
    })
  }

  const loadCache = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "client_retention_cache")
      .maybeSingle()
    const raw = data?.setting_value as string | null
    if (!raw) return false
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      const list: ClientScore[] = parsed?.clients ?? []
      if (list.length > 0) {
        applyClients(list)
        setLoading(false)
        try { localStorage.setItem(CLIENT_RETENTION_CACHE_KEY, JSON.stringify({ clients: list })) } catch {}
        return true
      }
    } catch {}
    return false
  }

  const loadHealth = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("compute-client-health", { body: {} })
      if (error) throw error
      const list: ClientScore[] = data?.clients ?? []
      applyClients(list)
      try { localStorage.setItem(CLIENT_RETENTION_CACHE_KEY, JSON.stringify({ clients: list })) } catch {}
    } catch (e: any) {
      if (!silent) toast.error("Failed to load client health: " + (e?.message ?? e))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const loadTrend = async () => {
    const since = new Date()
    since.setDate(since.getDate() - 42)
    const { data } = await supabase
      .from("client_health_snapshots")
      .select("score, computed_at")
      .gte("computed_at", since.toISOString())
      .order("computed_at", { ascending: true })

    const byDay = new Map<string, number[]>()
    ;(data ?? []).forEach((row: any) => {
      const day = new Date(row.computed_at).toISOString().slice(0, 10)
      const arr = byDay.get(day) ?? []
      arr.push(Number(row.score))
      byDay.set(day, arr)
    })
    const trendArr = Array.from(byDay.entries()).map(([day, scores]) => ({
      day: day.slice(5),
      avg: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
    }))
    setTrend(trendArr)
  }

  useEffect(() => {
    if (!(isAdmin || isOwner)) return
    // Instant load from cached payload, then refresh silently in background
    loadCache().then((hadCache) => {
      loadHealth(hadCache)
    })
    loadTrend()
    loadAutopilot()

    // Auto-refresh every 60s so signals stay fresh without manual reload
    const interval = setInterval(() => { loadHealth(true) }, 60000)

    // Realtime: re-compute when community activity or trust progress changes
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => { loadHealth(true) }, 3000)
    }
    const channel = supabase
      .channel("client-retention-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "trust_submissions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleRefresh)
      .subscribe()

    return () => {
      clearInterval(interval)
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isOwner])

  const loadAutopilot = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "client_retention_autopilot")
      .maybeSingle()
    const v = data?.setting_value as any
    setAutopilot(v === true || v === "true" || v?.enabled === true)
  }

  const toggleAutopilot = async (next: boolean) => {
    setAutopilot(next)
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        [{ setting_key: "client_retention_autopilot", setting_value: String(next), updated_by: user?.id, description: "Auto-send retention messages daily" }],
        { onConflict: "setting_key" }
      )
    if (error) {
      toast.error("Couldn't save autopilot setting")
      setAutopilot(!next)
      return
    }
    toast.success(next ? "Autopilot ON — daily sends enabled" : "Autopilot OFF")
  }

  const selected = useMemo(() => clients.find((c) => c.user_id === selectedId) ?? null, [clients, selectedId])

  // Auto-fill draft from precomputed value when selection changes
  useEffect(() => {
    if (selected?.draft !== undefined) setDraft(selected.draft ?? "")
  }, [selectedId, selected?.draft])

  const stats = useMemo(() => {
    const buckets: Record<Status, ClientScore[]> = { at_risk: [], slipping: [], stable: [], expansion_ready: [] }
    clients.forEach((c) => buckets[c.status].push(c))
    const avg = clients.length ? (clients.reduce((s, c) => s + c.score, 0) / clients.length).toFixed(1) : "0.0"
    const active = clients.filter((c) => c.last_active_at && (Date.now() - new Date(c.last_active_at).getTime()) / 86400000 <= 14).length
    const inactive = clients.length - active
    return { buckets, avg, active, inactive }
  }, [clients])

  const handleDraft = async () => {
    if (!selected) return
    setDrafting(true)
    setDraft("")
    try {
      const { data, error } = await supabase.functions.invoke("draft-retention-message", {
        body: {
          client_name: selected.full_name,
          status: selected.status,
          signals: selected.signals,
          program: selected.program,
        },
      })
      if (error) throw error
      setDraft(data?.draft ?? "")
    } catch (e: any) {
      toast.error("Couldn't draft message: " + (e?.message ?? e))
    } finally {
      setDrafting(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !draft.trim()) return
    if (!selected.email) {
      toast.error("No email on file for this client")
      return
    }
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke("send-retention-email", {
        body: {
          client_id: selected.user_id,
          client_name: selected.full_name,
          client_email: selected.email,
          status: selected.status,
          program: selected.program,
          signals: selected.signals,
          short_draft: draft,
        },
      })
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      toast.success(`Email sent to ${selected.full_name}`)
      setDraft("")
    } catch (e: any) {
      toast.error("Send failed: " + (e?.message ?? e))
    } finally {
      setSending(false)
    }
  }

  if (!isAdmin && !isOwner) return null

  const urgentList = stats.buckets.at_risk
  const slippingList = stats.buckets.slipping
  const expansionList = stats.buckets.expansion_ready

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-7xl">
      <Helmet><title>Client Retention | TruHeirs Admin</title></Helmet>

      <header className="mb-4 sm:mb-6 flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Client Retention</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Health pulse across every active TFV, TFBA & TFFM client.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={autopilot} onCheckedChange={toggleAutopilot} id="autopilot" />
            <label htmlFor="autopilot" className="text-muted-foreground text-xs sm:text-sm">Autopilot</label>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadHealth(); loadTrend(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>


      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Card><CardContent className="py-3 sm:py-4 px-3 sm:px-6">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Health Score</p>
          <p className="text-xl sm:text-2xl font-bold">{stats.avg}<span className="text-sm sm:text-base text-muted-foreground">/10</span></p>
        </CardContent></Card>
        <Card><CardContent className="py-3 sm:py-4 px-3 sm:px-6">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Active / Inactive</p>
          <p className="text-xl sm:text-2xl font-bold">{stats.active}<span className="text-sm sm:text-base text-muted-foreground"> / {stats.inactive}</span></p>
        </CardContent></Card>
        {(["at_risk","slipping","stable","expansion_ready"] as Status[]).map((s) => {
          const arr = stats.buckets[s].reduce((sum, c) => sum + c.arr_value, 0)
          return (
            <Card key={s} className={`${STATUS_META[s].bg} ring-1 ${STATUS_META[s].ring}`}>
              <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
                <p className={`text-[10px] sm:text-xs font-medium ${STATUS_META[s].color}`}>{STATUS_META[s].label}</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.buckets[s].length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">${arr.toLocaleString()} ARR</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="today" className="flex-1 sm:flex-none">Today</TabsTrigger>
          <TabsTrigger value="movement" className="flex-1 sm:flex-none">Movement</TabsTrigger>
          <TabsTrigger value="wins" className="flex-1 sm:flex-none">Wins</TabsTrigger>
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today" className="mt-4">
          <div className="grid lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-4">

            {/* Left queue */}
            <div className="space-y-4">
              <QueueGroup title="Urgent — Act Today" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} clients={urgentList} selectedId={selectedId} onSelect={setSelectedId} loading={loading} />
              <QueueGroup title="Slipping — Watch This Week" icon={<TrendingDown className="h-4 w-4 text-orange-600" />} clients={slippingList} selectedId={selectedId} onSelect={setSelectedId} loading={loading} />
            </div>

            {/* Right detail */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {selected ? selected.full_name : "Select a client"}
                    </CardTitle>
                    {selected && (
                      <p className="text-xs text-muted-foreground mt-0.5 break-all sm:break-normal">
                        {selected.email} · {selected.program?.toUpperCase()} · Score {selected.score}/10
                      </p>
                    )}
                  </div>
                  {selected && (
                    <Badge className={`${STATUS_META[selected.status].bg} ${STATUS_META[selected.status].color} border-none shrink-0`}>
                      {STATUS_META[selected.status].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {selected && selected.linked_users && selected.linked_users.length > 0 && (
                <div className="px-6 -mt-2 mb-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Linked:</span>
                  {selected.linked_users.map((lu) => {
                    const match = clients.find((c) => c.user_id === lu.user_id)
                    const name = match?.full_name ?? lu.full_name ?? 'User'
                    return (
                      <button
                        key={lu.user_id}
                        onClick={() => match && setSelectedId(match.user_id)}
                        disabled={!match}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${match ? 'hover:bg-amber-50 border-[#ffb500]/60 text-[#290a52]' : 'border-muted text-muted-foreground opacity-60 cursor-default'}`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              )}


              <CardContent>
                {!selected ? (
                  <p className="text-sm text-muted-foreground">Pick a client from the queue to see signals and a drafted save play.</p>
                ) : (
                  <div className="space-y-5">
                    <section>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Signals Detected</p>
                      <ul className="space-y-1.5">
                        {selected.signals.length === 0 && <li className="text-sm text-muted-foreground">No risk signals — client is on track.</li>}
                        {selected.signals.map((s, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.severity === "critical" ? "bg-red-500" : s.severity === "warn" ? "bg-orange-500" : "bg-slate-400"}`} />
                            {s.label}
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drafted Save Play</p>
                        <Button size="sm" variant="outline" onClick={handleDraft} disabled={drafting}>
                          {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                          {drafting ? "Drafting…" : draft ? "Re-draft" : "Draft message"}
                        </Button>
                      </div>
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Click 'Draft message' to generate an outreach in your voice."
                        className="min-h-[160px] text-sm"
                      />
                      <div className="mt-3 flex justify-end">
                        <Button
                          onClick={handleSend}
                          disabled={!draft.trim() || sending}
                          className="bg-[#ffb500] text-[#290a52] hover:bg-[#e6a300]"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                          Approve & Send
                        </Button>
                      </div>
                    </section>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MOVEMENT */}
        <TabsContent value="movement" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Health Score Trend (6 weeks)</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Line type="monotone" dataKey="avg" stroke="#ffb500" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{
                    name: "Now",
                    "At Risk": stats.buckets.at_risk.length,
                    "Slipping": stats.buckets.slipping.length,
                    "Stable": stats.buckets.stable.length,
                    "Expansion": stats.buckets.expansion_ready.length,
                  }]}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="At Risk" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Slipping" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Stable" stackId="a" fill="#10b981" />
                    <Bar dataKey="Expansion" stackId="a" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WINS */}
        <TabsContent value="wins" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" /> Ready for Expansion / Referral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {expansionList.length === 0 && <p className="text-sm text-muted-foreground">No expansion-ready clients yet.</p>}
                {expansionList.map((c) => (
                  <button key={c.user_id} onClick={() => setSelectedId(c.user_id)} className="w-full text-left p-3 rounded-lg border hover:bg-purple-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.full_name}</span>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">{c.score}/10</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.program?.toUpperCase()} · ${c.arr_value.toLocaleString()} ARR</p>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-emerald-600" /> Healthy & Stable
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[420px] overflow-auto">
                {stats.buckets.stable.length === 0 && <p className="text-sm text-muted-foreground">No stable clients tracked.</p>}
                {stats.buckets.stable.map((c) => (
                  <button key={c.user_id} onClick={() => setSelectedId(c.user_id)} className="w-full text-left p-3 rounded-lg border hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.full_name}</span>
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300">{c.score}/10</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.program?.toUpperCase()}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QueueGroup({
  title, icon, clients, selectedId, onSelect, loading,
}: {
  title: string; icon: React.ReactNode; clients: ClientScore[]; selectedId: string | null; onSelect: (id: string) => void; loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{icon} {title} <span className="ml-auto text-xs text-muted-foreground font-normal">{clients.length}</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-[300px] overflow-auto">
        {loading && clients.length === 0 && <>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </>}
        {!loading && clients.length === 0 && <p className="text-xs text-muted-foreground py-2">No clients in this group.</p>}

        {clients.map((c) => (
          <button
            key={c.user_id}
            onClick={() => onSelect(c.user_id)}
            className={`w-full text-left p-2.5 rounded-md border text-sm transition-colors ${selectedId === c.user_id ? "border-[#ffb500] bg-amber-50" : "hover:bg-muted/40"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{c.full_name}</span>
              <Badge variant="outline" className={`${STATUS_META[c.status].color} border-current text-xs`}>{c.score}/10</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{c.signals[0]?.label ?? "—"}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
