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
