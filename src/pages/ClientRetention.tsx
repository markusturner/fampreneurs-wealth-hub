import { useEffect, useMemo, useRef, useState } from "react"
import { Helmet } from "react-helmet-async"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useUserRole } from "@/hooks/useUserRole"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { programShortLabel } from "@/lib/programs"
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
import { AlertTriangle, TrendingDown, TrendingUp, Heart, Loader2, Sparkles, Send, RefreshCw, StickyNote, Save, Trash2, ClipboardList } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, BarChart, Bar, Legend } from "recharts"
import { CoachingCallAttendanceLog } from "@/components/dashboard/coaching-call-attendance-log"
import { BackToWelcome } from "@/components/layout/BackToWelcome"

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

// Rule-based outreach topic per client — what Markus should reach out about
function outreachTopic(c: ClientScore): string {
  const labels = c.signals.map((s) => s.label.toLowerCase()).join(" | ")
  const has = (re: RegExp) => re.test(labels)

  if (has(/fathom|transcript/)) return "No accountability-call attendance on record — personally invite them to this week's call."
  if (has(/attendance|missed.*call|no.*call/)) return "Missing coaching calls — ask what's blocking them and offer a 1:1 catch-up."
  if (has(/community|post|comment|engag/)) return "Quiet in the community — tag them in a win thread or ask for a quick update post."
  if (has(/trust|document/)) return "Trust paperwork is stalled — offer to walk through the next document together."
  if (has(/succession/)) return "Succession plan needs attention — nudge them to finish the next step."
  if (has(/payment|overdue|invoice/)) return "Payment is overdue — reach out about getting the account current."
  if (has(/renewal|tenure|contract/)) return "Renewal window is close — book a strategy call to lock in the next term."
  if (has(/inactive|no activity|quiet|login/)) return "No recent activity — send a personal check-in to see how they're doing."

  switch (c.status) {
    case "at_risk": return "Gone quiet — send a warm personal check-in and offer a no-pressure 15-min call."
    case "slipping": return "Engagement dipping — point them to one small win they can get this week."
    case "stable": return "Doing well — ask for a testimonial or a referral to a family they know."
    case "expansion_ready": return "Ready for the next tier — invite them to a strategy call about upgrading."
  }
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string; ring: string }> = {
  at_risk: { label: "At Risk", color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" },
  slipping: { label: "Slipping", color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" },
  stable: { label: "Stable", color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  expansion_ready: { label: "Expansion Ready", color: "text-purple-700", bg: "bg-purple-50", ring: "ring-purple-200" },
}

export default function ClientRetention() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAttendanceView = new URLSearchParams(location.search).get('tab') === 'attendance'
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
  type NoteEntry = { id: string; note: string; created_at: string }
  type NotesEntry = { entries: NoteEntry[]; status_override: Status | null }
  const [notesMap, setNotesMap] = useState<Record<string, NotesEntry>>({})
  const notesMapRef = useRef(notesMap)
  useEffect(() => { notesMapRef.current = notesMap }, [notesMap])
  type CallRec = { id: string; title: string; coach: string | null; date: string }
  const [attendanceMap, setAttendanceMap] = useState<Record<string, CallRec[]>>({})
  const attendanceMapRef = useRef(attendanceMap)
  useEffect(() => { attendanceMapRef.current = attendanceMap }, [attendanceMap])
  type HistoryRec = {
    id: string
    user_id: string
    prev_score: number | null
    new_score: number | null
    prev_status: string | null
    new_status: string | null
    reason: string | null
    created_at: string
  }
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRec[]>>({})
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

  // Parse free-text notes to derive positive dimension boosts so the score adapts.
  // Each match adds a positive signal and removes stale negative signals for that dimension.
  const NOTE_SIGNATURE = "📝"
  const analyzeNotes = (combined: string) => {
    const text = combined.toLowerCase()
    const has = (re: RegExp) => re.test(text)
    const boosts = { attendance: 0, community: 0, trust: 0, succession: 0, response: 0, fathom: 0 }
    const addedSignals: { label: string; severity?: string }[] = []
    const drop = { attendance: false, community: false, trust: false, succession: false, response: false, fathom: false }
    let forceExpansion = false

    // Trust progress
    const trustsComplete = has(/\b(3|three|all)\s+trusts?\b.*\b(complete|done|drafted|finish|signed|funded)\b/) ||
                           has(/\b(complete|done|drafted|finish|signed)\b.*\b(3|three|all)\s+trusts?\b/) ||
                           has(/completed\s+(their|the)?\s*3\s+trusts?/)
    const funded = has(/\b(funded|funding|moved\s+(assets|house|property)|assets?\s+(moved|funded|titled))\b/) ||
                   has(/\bdone\s+for\s+you\b/)
    if (trustsComplete) { boosts.trust = 10; drop.trust = true; addedSignals.push({ label: "✅ Note: all 3 trusts completed", severity: "info" }) }
    else if (has(/\btrust\b.*\b(complete|done|signed|drafted|progress|started)\b/) || has(/\b(family|business|ministry)\s+trust\b/)) {
      boosts.trust = Math.max(boosts.trust, 8); drop.trust = true; addedSignals.push({ label: "✅ Note: trust work in progress", severity: "info" })
    }
    if (funded) { boosts.trust = Math.max(boosts.trust, 9); addedSignals.push({ label: "✅ Note: assets funded into trust", severity: "info" }) }
    // Finished the trusts = the result we sell — that alone earns Expansion Ready
    if (trustsComplete) forceExpansion = true

    // Testimonial / results = strongest proof the client is winning
    const testimonial = has(/\b(testimonial|case study|success story|gave (a )?review|left (a )?review|video review|shared (their|his|her) story)\b/)
    if (testimonial) {
      boosts.fathom = 10; boosts.community = Math.max(boosts.community, 9); drop.community = true; drop.fathom = true
      addedSignals.push({ label: "✅ Note: gave a testimonial", severity: "info" })
    }
    const gotResults = has(/\b(got results|big results|win|won|closed|saved (them )?\$?|protected (their|his|her) (assets|home|property)|milestone)\b/)
    if (gotResults) { boosts.fathom = Math.max(boosts.fathom, 9); addedSignals.push({ label: "✅ Note: real results achieved", severity: "info" }) }
    if (testimonial && (trustsComplete || funded)) forceExpansion = true
    // Testimonial but trusts not finished = solid, not expansion — hold them at Stable
    const capStable = (testimonial || gotResults) && !trustsComplete && !funded

    // Attendance
    if (has(/\b(attended|showed up|made it|on the call|joined (the )?call|hopped on)\b/)) {
      boosts.attendance = 9; drop.attendance = true; addedSignals.push({ label: "✅ Note: attended recent coaching call", severity: "info" })
    }
    // Community
    if (has(/\b(active in (the )?community|posted|posting|engaged|engaging)\b/)) {
      boosts.community = 9; drop.community = true; addedSignals.push({ label: "✅ Note: active in community", severity: "info" })
    }
    // Response time
    if (has(/\b(responsive|replied|got back|reached out|messaged me|sent (a )?dm)\b/)) {
      boosts.response = 9; drop.response = true; addedSignals.push({ label: "✅ Note: responsive in DMs", severity: "info" })
    }
    // Succession
    if (has(/\bsuccession\b.*\b(complete|done|started|in progress|drafted)\b/)) {
      boosts.succession = 9; drop.succession = true; addedSignals.push({ label: "✅ Note: succession plan progressing", severity: "info" })
    }
    // Fathom / sentiment
    if (has(/\b(happy|loves|love it|excited|grateful|big win|breakthrough|expand|upgrade|referral)\b/)) {
      boosts.fathom = 8; addedSignals.push({ label: "✅ Note: positive sentiment", severity: "info" })
    }
    if (has(/\b(frustrat|upset|cancel|refund|leaving|quit|unhappy|complain)\b/)) {
      boosts.fathom = Math.min(boosts.fathom || 4, 4); addedSignals.push({ label: "⚠️ Note: concern raised", severity: "warn" })
    }

    return { boosts, addedSignals, drop, forceExpansion }
  }

  // Map signal labels to a dimension so we can strip stale negatives when a note overrides them
  const signalDim = (label: string): keyof ReturnType<typeof analyzeNotes>["drop"] | null => {
    const l = label.toLowerCase()
    if (l.includes("trust")) return "trust"
    if (l.includes("coaching call") || l.includes("missed session") || l.includes("attendance")) return "attendance"
    if (l.includes("community") || l.includes("posting")) return "community"
    if (l.includes("dm") || l.includes("response")) return "response"
    if (l.includes("succession")) return "succession"
    if (l.includes("fathom")) return "fathom"
    return null
  }

  const WEIGHTS = { attendance: 0.20, community: 0.15, trust: 0.20, succession: 0.10, response: 0.10, fathom: 0.15 } as const

  const mergeNotes = (list: ClientScore[], map: Record<string, NotesEntry>): ClientScore[] => {
    return list.map((c) => {
      const entry = map[c.user_id]
      if (!entry || (!entry.entries.length && !entry.status_override)) return c
      const combined = entry.entries.map((e) => e.note).join("\n")
      const { boosts, addedSignals, drop, forceExpansion } = analyzeNotes(combined)

      // Build note signals (each entry shows as its own admin note line)
      const noteSignals = entry.entries.map((e) => ({
        label: `${NOTE_SIGNATURE} ${new Date(e.created_at).toLocaleDateString()}: ${e.note}`,
        severity: "info" as const,
      }))

      // Drop stale negatives for dimensions overridden by note keywords
      const trimmedExisting = c.signals.filter((s) => {
        if (s.severity === "info") return true
        const dim = signalDim(s.label)
        return !(dim && drop[dim])
      })

      // Bump score by averaged dimension boosts
      let scoreDelta = 0
      ;(Object.keys(boosts) as (keyof typeof boosts)[]).forEach((k) => {
        if (boosts[k] > 0) {
          // assume the baseline for that dim was ~5; gain = (boost - 5) * weight
          scoreDelta += Math.max(0, (boosts[k] - 5)) * WEIGHTS[k]
        }
      })
      let nextScore = Math.min(10, Math.max(1, Number((c.score + scoreDelta).toFixed(1))))
      // A strong positive note is first-hand evidence — it should lift them out of the low buckets
      const strongPositives = (Object.keys(boosts) as (keyof typeof boosts)[]).filter((k) => boosts[k] >= 9).length
      if (strongPositives >= 2) nextScore = Math.max(nextScore, 8.0)
      else if (strongPositives === 1) nextScore = Math.max(nextScore, 7.0)
      // Results are the whole point — proof of outcome pushes them near the top
      if (boosts.trust >= 10) nextScore = Math.max(nextScore, 8.8)
      if (boosts.fathom >= 10) nextScore = Math.max(nextScore, 8.8)
      if (boosts.trust >= 9 && boosts.fathom >= 9) nextScore = Math.max(nextScore, 9.2)
      let nextStatus: Status = entry.status_override ?? c.status
      if (forceExpansion) { nextStatus = "expansion_ready"; nextScore = Math.max(nextScore, 9) }
      else if (!entry.status_override) {
        if (nextScore >= 8.5) nextStatus = "expansion_ready"
        else if (nextScore >= 6.5) nextStatus = "stable"
        else if (nextScore >= 4) nextStatus = "slipping"
        else nextStatus = "at_risk"
      }

      return {
        ...c,
        score: nextScore,
        status: nextStatus,
        signals: [...addedSignals, ...noteSignals, ...trimmedExisting],
      }
    })
  }

  const CALL_SIGNATURE = "🎧"

  // Attendance log is the source of truth for coaching calls — fold it into signals + score
  const mergeAttendance = (list: ClientScore[], map: Record<string, CallRec[]>): ClientScore[] => {
    const now = Date.now()
    return list.map((c) => {
      const ids = [c.user_id, ...((c.linked_users ?? []).map((l) => l.user_id))]
      const calls = ids.flatMap((id) => map[id] ?? [])
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      if (calls.length === 0) return c
      const last = calls[0]
      const days = Math.floor((now - new Date(last.date).getTime()) / 86400000)
      const count90 = calls.filter((k) => (now - new Date(k.date).getTime()) / 86400000 <= 90).length

      // Drop stale "no attendance / missed calls" signals — the log proves otherwise
      const trimmed = c.signals.filter((s) => {
        const l = s.label.toLowerCase()
        if (s.severity === "info") return true
        return !(l.includes("coaching call") || l.includes("attendance") || l.includes("missed session"))
      })

      const attendanceScore = days <= 14 ? 9 : days <= 30 ? 7 : days <= 60 ? 5 : 3
      const delta = Math.max(0, attendanceScore - 5) * 0.20
      const score = Math.min(10, Math.max(1, Number((c.score + delta).toFixed(1))))
      const label = days <= 60
        ? `${CALL_SIGNATURE} Attended ${count90} call${count90 === 1 ? "" : "s"} in last 90d — latest: ${last.title} (${new Date(last.date).toLocaleDateString()})`
        : `${CALL_SIGNATURE} Last coaching call ${days}d ago — ${last.title}`
      return {
        ...c,
        score,
        signals: [{ label, severity: days <= 60 ? "info" : "warn" }, ...trimmed],
      }
    })
  }

  const applyClients = (list: ClientScore[], overrideMap?: Record<string, NotesEntry>, attMap?: Record<string, CallRec[]>) => {
    // Always strip prior note-derived signals so notes don't accumulate or persist after deletion
    const cleaned = list.map((c) => ({
      ...c,
      signals: c.signals.filter((s) => !s.label.startsWith(NOTE_SIGNATURE) && !s.label.startsWith(CALL_SIGNATURE) && !s.label.startsWith("✅ Note:") && !s.label.startsWith("⚠️ Note:")),
    }))
    const withCalls = mergeAttendance(cleaned, attMap ?? attendanceMapRef.current)
    const noteMap = overrideMap ?? notesMapRef.current
    const merged = mergeNotes(withCalls, noteMap).map((c) => {
      // Keep the category in sync with the adjusted score unless it's manually overridden
      if (noteMap[c.user_id]?.status_override) return c
      const status: Status = c.score >= 8.5 ? "expansion_ready" : c.score >= 6.5 ? "stable" : c.score >= 4 ? "slipping" : "at_risk"
      return { ...c, status }
    })
    setClients(merged)
    setSelectedId((prev) => {
      if (prev && merged.some((c) => c.user_id === prev)) return prev
      const firstAtRisk = merged.find((c) => c.status === "at_risk") ?? merged[0]
      return firstAtRisk?.user_id ?? null
    })
    return merged
  }

  const loadAttendance = async () => {
    const since = new Date()
    since.setDate(since.getDate() - 365)
    const { data } = await supabase
      .from("session_attendance")
      .select("id, user_id, session_id, manual_session_title, manual_coach_name, manual_session_date, joined_at, created_at, attended, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000)

    const rows = (data ?? []).filter((r: any) => r.attended !== false)
    const sessionIds = Array.from(new Set(rows.map((r: any) => r.session_id).filter(Boolean)))
    let sessions: Record<string, { title: string; date: string | null; coach: string | null }> = {}
    if (sessionIds.length) {
      const { data: srows } = await supabase
        .from("group_coaching_sessions")
        .select("id, title, session_date, coach_name")
        .in("id", sessionIds as string[])
      ;(srows ?? []).forEach((s: any) => { sessions[s.id] = { title: s.title, date: s.session_date, coach: s.coach_name } })
    }

    const map: Record<string, CallRec[]> = {}
    // Same person + same day + same call = one attendance, no matter how many rows exist
    const seen = new Set<string>()
    rows.forEach((r: any) => {
      const s = r.session_id ? sessions[r.session_id] : null
      const date = r.manual_session_date || s?.date || r.joined_at || r.created_at
      if (!date) return
      const iso = new Date(date).toISOString()
      const title = r.manual_session_title || s?.title || "Coaching call"
      const coachName = (r.manual_coach_name || s?.coach || "").trim().toLowerCase()
      // Only an exact repeat (same person, day, call, coach, session) counts once —
      // different coaches or sessions on the same day are separate attendances
      const key = `${r.user_id}|${iso.slice(0, 10)}|${title.trim().toLowerCase()}|${coachName}|${r.session_id ?? ""}`
      if (seen.has(key)) return
      seen.add(key)
      const rec: CallRec = {
        id: r.id,
        title,
        coach: r.manual_coach_name || s?.coach || null,
        date: iso,
      }
      if (!map[r.user_id]) map[r.user_id] = []
      map[r.user_id].push(rec)
    })
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.date < b.date ? 1 : -1)))
    setAttendanceMap(map)
    attendanceMapRef.current = map
    return map
  }

  const loadHistory = async () => {
    const { data } = await supabase
      .from("client_retention_history")
      .select("id, user_id, prev_score, new_score, prev_status, new_status, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(1000)
    const map: Record<string, HistoryRec[]> = {}
    ;(data ?? []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = []
      map[r.user_id].push(r as HistoryRec)
    })
    setHistoryMap(map)
  }

  // Record what a note/status change actually did to the score + category
  const logChange = async (
    userId: string,
    before: ClientScore | undefined,
    after: ClientScore | undefined,
    reason: string,
  ) => {
    if (!before && !after) return
    const row = {
      user_id: userId,
      prev_score: before?.score ?? null,
      new_score: after?.score ?? null,
      prev_status: before?.status ?? null,
      new_status: after?.status ?? null,
      reason,
      changed_by: user?.id ?? null,
    }
    const { data, error } = await supabase
      .from("client_retention_history")
      .insert(row)
      .select("id, user_id, prev_score, new_score, prev_status, new_status, reason, created_at")
      .single()
    if (error || !data) return
    setHistoryMap((prev) => ({ ...prev, [userId]: [data as HistoryRec, ...(prev[userId] ?? [])] }))
  }

  const loadNotes = async () => {
    const [{ data: statusRows }, { data: entryRows }] = await Promise.all([
      supabase.from("client_retention_notes").select("user_id, status_override"),
      supabase.from("client_retention_note_entries").select("id, user_id, note, created_at").order("created_at", { ascending: false }),
    ])
    const map: Record<string, NotesEntry> = {}
    ;(statusRows ?? []).forEach((r: any) => {
      map[r.user_id] = { entries: [], status_override: (r.status_override as Status) ?? null }
    })
    ;(entryRows ?? []).forEach((r: any) => {
      if (!map[r.user_id]) map[r.user_id] = { entries: [], status_override: null }
      map[r.user_id].entries.push({ id: r.id, note: r.note, created_at: r.created_at })
    })
    setNotesMap(map)
    return map
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
    // Load notes first so initial render of cached/fresh data is merged
    Promise.all([loadNotes(), loadAttendance()]).then(() => {
      loadCache().then((hadCache) => {
        loadHealth(hadCache)
      })
    })
    loadTrend()
    loadAutopilot()
    loadHistory()

    // Auto-refresh every 60s so signals stay fresh without manual reload
    const interval = setInterval(() => { loadAttendance().then((m) => loadHealth(true)) }, 60000)

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

  // Auto-fill status selector when selection changes (notes are append-only, draft starts empty)
  useEffect(() => {
    if (selected?.draft !== undefined) setDraft(selected.draft ?? "")
    const entry = selected ? notesMap[selected.user_id] : null
    setNoteDraft("")
    setStatusDraft((entry?.status_override as Status) ?? "auto")
  }, [selectedId, selected?.draft])

  const saveNote = async () => {
    if (!selected) return
    const text = noteDraft.trim()
    const existing = notesMap[selected.user_id]
    const nextStatus = statusDraft === "auto" ? null : statusDraft
    const statusChanged = (existing?.status_override ?? null) !== nextStatus
    if (!text && !statusChanged) {
      toast.error("Type a note or change the status first.")
      return
    }
    setSavingNote(true)
    try {
      let newEntry: NoteEntry | null = null
      if (text) {
        const { data, error } = await supabase
          .from("client_retention_note_entries")
          .insert({ user_id: selected.user_id, note: text, created_by: user?.id ?? null })
          .select("id, note, created_at")
          .single()
        if (error) throw error
        newEntry = { id: data.id, note: data.note, created_at: data.created_at }
      }
      if (statusChanged) {
        const { error } = await supabase
          .from("client_retention_notes")
          .upsert(
            { user_id: selected.user_id, note: "", status_override: nextStatus, updated_by: user?.id ?? null },
            { onConflict: "user_id" }
          )
        if (error) throw error
      }
      const prior = existing ?? { entries: [], status_override: null }
      const nextEntry: NotesEntry = {
        entries: newEntry ? [newEntry, ...prior.entries] : prior.entries,
        status_override: nextStatus,
      }
      const nextMap = { ...notesMap, [selected.user_id]: nextEntry }
      setNotesMap(nextMap)
      const before = clients.find((c) => c.user_id === selected.user_id)
      const updated = applyClients(clients, nextMap)
      const after = updated.find((c) => c.user_id === selected.user_id)
      const reason = text
        ? `Note added: "${text.slice(0, 140)}"${statusChanged ? ` + status set to ${nextStatus ?? "auto"}` : ""}`
        : `Status set to ${nextStatus ?? "auto (from signals)"}`
      await logChange(selected.user_id, before, after, reason)
      setNoteDraft("")
      const moved = before && after && (before.score !== after.score || before.status !== after.status)
      toast.success(
        moved
          ? `Saved — score ${before!.score} → ${after!.score}`
          : newEntry
            ? "Note added (score unchanged)"
            : "Status updated"
      )
    } catch (e: any) {
      toast.error("Couldn't save note: " + (e?.message ?? e))
    } finally {
      setSavingNote(false)
    }
  }

  const deleteNoteEntry = async (entryId: string) => {
    if (!selected) return
    setSavingNote(true)
    try {
      const { error } = await supabase
        .from("client_retention_note_entries")
        .delete()
        .eq("id", entryId)
      if (error) throw error
      const existing = notesMap[selected.user_id]
      if (!existing) return
      const nextEntry: NotesEntry = {
        ...existing,
        entries: existing.entries.filter((e) => e.id !== entryId),
      }
      const nextMap = { ...notesMap, [selected.user_id]: nextEntry }
      setNotesMap(nextMap)
      const before = clients.find((c) => c.user_id === selected.user_id)
      const updated = applyClients(clients, nextMap)
      const after = updated.find((c) => c.user_id === selected.user_id)
      await logChange(selected.user_id, before, after, "Note removed")
      toast.success("Note removed")
    } catch (e: any) {
      toast.error("Couldn't delete note: " + (e?.message ?? e))
    } finally {

      setSavingNote(false)
    }
  }

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
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-7xl space-y-4">
      <Helmet><title>{isAttendanceView ? 'Attendance Log' : 'Client Retention'} | TruHeirs Admin</title></Helmet>
      <BackToWelcome />

      {isAttendanceView ? (
        <>
          <header className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Attendance Log
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Coaching call attendance — automated and manual entries.</p>
          </header>
          <CoachingCallAttendanceLog />
        </>
      ) : (
        <>
      <header className="mb-4 sm:mb-6 flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Client Retention</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Health pulse across every active TFV, PEA & TFFM client.</p>
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
                        {selected.email} · {programShortLabel(selected.program)} · Score {selected.score}/10
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
                    <section className="rounded-md border border-[#ffb500]/50 bg-amber-50/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#290a52] mb-1">Reach Out About</p>
                      <p className="text-sm text-[#290a52]">{outreachTopic(selected)}</p>
                    </section>
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

                    {(() => {
                      const ids = [selected.user_id, ...((selected.linked_users ?? []).map((l) => l.user_id))]
                      const calls = ids.flatMap((id) => attendanceMap[id] ?? []).sort((a, b) => (a.date < b.date ? 1 : -1))
                      return (
                        <section>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5" /> Calls Attended ({calls.length})
                            </p>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/client-retention?tab=attendance")}>
                              Attendance log
                            </Button>
                          </div>
                          {calls.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No calls logged for this client yet.</p>
                          ) : (
                            <ul className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                              {calls.slice(0, 25).map((k) => (
                                <li key={k.id} className="flex items-center justify-between gap-3 rounded-md border bg-white px-2.5 py-1.5 text-sm">
                                  <span className="truncate">{k.title}{k.coach ? ` — ${k.coach}` : ""}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(k.date).toLocaleDateString()}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      )
                    })()}

                    {(() => {
                      const hist = historyMap[selected.user_id] ?? []
                      const label = (s: string | null) =>
                        s === "at_risk" ? "At Risk" : s === "slipping" ? "Slipping" : s === "stable" ? "Stable" : s === "expansion_ready" ? "Expansion Ready" : "—"
                      return (
                        <section>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Change History ({hist.length})
                          </p>
                          {hist.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No changes recorded yet — add a note or set a status to start the log.</p>
                          ) : (
                            <ul className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                              {hist.map((h) => {
                                const scoreMoved = h.prev_score !== h.new_score
                                const statusMoved = h.prev_status !== h.new_status
                                return (
                                  <li key={h.id} className="rounded-md border bg-white px-2.5 py-2 text-sm">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {new Date(h.created_at).toLocaleString()}
                                    </div>
                                    <div className="mt-0.5">
                                      {scoreMoved || statusMoved ? (
                                        <span className="font-medium text-[#290a52]">
                                          {scoreMoved && <>Rating {h.prev_score ?? "—"} → {h.new_score ?? "—"} out of 10</>}
                                          {scoreMoved && statusMoved && " · "}
                                          {statusMoved && <>{label(h.prev_status)} → {label(h.new_status)}</>}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          No change · Rating stayed {h.new_score ?? h.prev_score ?? "—"} out of 10
                                        </span>
                                      )}
                                    </div>
                                    {h.reason && <div className="text-xs text-muted-foreground break-words">{h.reason}</div>}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </section>
                      )
                    })()}

                    <section className="rounded-lg border border-[#ffb500]/40 bg-amber-50/40 p-3">
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#290a52] flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5" /> Your Notes & Status
                        </p>
                        <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as Status | "auto")}>
                          <SelectTrigger className="h-8 w-[170px] text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (from signals)</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="slipping">Slipping</SelectItem>
                            <SelectItem value="stable">Stable</SelectItem>
                            <SelectItem value="expansion_ready">Expansion Ready</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(notesMap[selected.user_id]?.entries.length ?? 0) > 0 && (
                        <ul className="mb-3 space-y-1.5">
                          {notesMap[selected.user_id].entries.map((entry) => (
                            <li key={entry.id} className="flex items-start gap-2 rounded-md bg-white border border-amber-200 p-2 text-sm">
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {new Date(entry.created_at).toLocaleString()}
                                </div>
                                <div className="whitespace-pre-wrap break-words">{entry.note}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNoteEntry(entry.id)}
                                disabled={savingNote}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                aria-label="Delete note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (!savingNote) saveNote();
                          }
                        }}
                        placeholder="Add a new note & press Enter to append (Shift+Enter for a new line)."
                        className="min-h-[90px] text-sm bg-white"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button size="sm" onClick={saveNote} disabled={savingNote} className="bg-[#290a52] text-white hover:bg-[#1d0639]">
                          {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                          Add note & save status
                        </Button>
                      </div>
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
                    <p className="text-xs text-muted-foreground mt-1">{programShortLabel(c.program)} · ${c.arr_value.toLocaleString()} ARR</p>
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
                    <p className="text-xs text-muted-foreground mt-1">{programShortLabel(c.program)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
        </>
      )}
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
            <p className="text-xs text-muted-foreground truncate mt-0.5">{outreachTopic(c)}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
