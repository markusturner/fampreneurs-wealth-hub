import { profileProgramCodes } from "./programs"

export const CLIENT_QUEUE_STAGES = [
  "invited", "at_risk", "slipping", "stable", "expansion_ready", "continuity", "follow_up", "deal_lost",
] as const

export type ClientQueueStage = typeof CLIENT_QUEUE_STAGES[number]

export function clientQueueBuckets<T>() {
  return Object.fromEntries(CLIENT_QUEUE_STAGES.map((stage) => [stage, [] as T[]])) as Record<ClientQueueStage, T[]>
}

export function clientQueueStage(automatic: ClientQueueStage, override?: ClientQueueStage | null): ClientQueueStage {
  return override ?? automatic
}

// An invited client counts as active once they finish onboarding/agreement, or once a real
// (non-placeholder) client has a program start date. Skipped onboarding alone does not count.
export function isActivatedInvite(p: { finishedOnboarding: boolean; displayName?: string | null; contractStartDate?: string | null }): boolean {
  if (p.finishedOnboarding) return true
  return Boolean(p.contractStartDate) && p.displayName !== "Invited User"
}

export function isPendingClientInvite(needsProfileCompletion: boolean | null, isActive: boolean): boolean {
  return needsProfileCompletion === true && !isActive
}
// Two logins can end up with the same person's profile (same email and name).
// Only one card should show: the one with the newest program start date,
// falling back to the oldest account. Returns every id (profile + login) to hide.
export type QueueProfile = { id: string; user_id: string; full_name: string; email?: string | null; contract_start_date?: string | null; created_at: string }
export function duplicateClientIds(profiles: QueueProfile[]): Set<string> {
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ")
  const groups = new Map<string, QueueProfile[]>()
  profiles.forEach((p) => {
    const email = norm(p.email)
    const name = norm(p.full_name)
    if (!email || !name) return
    const key = `${email}|${name}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  })
  const hidden = new Set<string>()
  groups.forEach((list) => {
    if (list.length < 2) return
    const keep = [...list].sort((a, b) =>
      (b.contract_start_date ?? "").localeCompare(a.contract_start_date ?? "") ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0]
    list.forEach((p) => {
      if (p === keep) return
      if (p.id) hidden.add(p.id)
      if (p.user_id) hidden.add(p.user_id)
    })
  })
  return hidden
}

// A program has run out when no extension date is set and its length has passed since the start date.
// The Trust Vault: older yearly offers end after 365 days; new 16-week members are left alone.
// The Private Estate Accelerator: ends after 90 days.
export type QueueContract = { programName?: string | null; startDate?: string | null; dueDate?: string | null; extensionDate?: string | null }
const DAY_MS = 86400000
export function programRanOut(c: QueueContract, today: Date = new Date()): boolean {
  if (c.extensionDate || !c.startDate) return false
  const start = new Date(`${c.startDate.slice(0, 10)}T00:00:00`)
  if (isNaN(start.getTime())) return false
  const codes = profileProgramCodes(c.programName)
  let limit: number | null = null
  if (codes.includes("tfba")) limit = 90
  else if (codes.includes("tfv")) {
    const due = c.dueDate ? new Date(`${c.dueDate.slice(0, 10)}T00:00:00`) : null
    const lengthDays = due && !isNaN(due.getTime()) ? Math.round((due.getTime() - start.getTime()) / DAY_MS) : null
    if (lengthDays != null && lengthDays <= 120) return false // new 16-week Trust Vault offer
    limit = 365
  }
  if (limit == null) return false
  return (today.getTime() - start.getTime()) / DAY_MS > limit
}

// Days until a client's program ends. An extension date replaces the due date.
export function daysUntilExpiry(dueDate?: string | null, extensionDate?: string | null, today: Date = new Date()): number | null {
  const end = extensionDate || dueDate
  if (!end) return null
  const endDay = new Date(`${end.slice(0, 10)}T00:00:00`)
  if (isNaN(endDay.getTime())) return null
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((endDay.getTime() - startOfToday.getTime()) / DAY_MS)
}

// Day badge color: green when 30 or more days are left, sliding to bright red on or after the end date.
export function expiryBadgeHue(daysLeft: number | null): number | null {
  if (daysLeft == null) return null
  const closeness = Math.min(1, Math.max(0, (30 - daysLeft) / 30))
  return Math.round(142 * (1 - closeness))
}

export function expiryBadgeStyle(daysLeft: number | null): { backgroundColor: string; color: string } | null {
  const hue = expiryBadgeHue(daysLeft)
  if (hue == null) return null
  const closeness = 1 - hue / 142
  const saturation = Math.round(70 + 25 * closeness)
  const lightness = Math.round(88 - 36 * closeness)
  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    color: closeness > 0.6 ? "hsl(0 0% 100%)" : `hsl(${hue} 80% 22%)`,
  }
}
