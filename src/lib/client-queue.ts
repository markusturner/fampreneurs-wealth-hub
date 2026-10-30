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

export function isPendingClientInvite(needsProfileCompletion: boolean | null, isActive: boolean): boolean {
  return needsProfileCompletion === true && !isActive
}