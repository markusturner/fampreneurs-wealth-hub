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