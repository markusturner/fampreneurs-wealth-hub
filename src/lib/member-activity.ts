export type ActivityGroup = 'now' | 'today' | 'earlier'

/** A member counts as "active now" while their presence is live in the community. */
export function activityGroup(lastSeen: string | null | undefined, isOnline: boolean, now: Date = new Date()): ActivityGroup {
  if (isOnline) return 'now'
  if (!lastSeen) return 'earlier'
  const seen = new Date(lastSeen)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return seen >= startOfToday ? 'today' : 'earlier'
}

/** Short "how long ago" label: "Active now", "5m ago", "3h ago", "2d ago", "4w ago", "3mo ago". */
export function lastActiveLabel(lastSeen: string | null | undefined, isOnline: boolean, now: Date = new Date()): string {
  if (isOnline) return 'Active now'
  if (!lastSeen) return 'Not active yet'
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(lastSeen).getTime()) / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
