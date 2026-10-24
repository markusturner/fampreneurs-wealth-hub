// Last-seen community messages, so reopening a community shows messages
// instantly while fresh data loads in the background.

export const FEED_CACHE_LIMIT = 150
export const MOBILE_MESSAGE_WINDOW = 40

type CacheStorage = Pick<Storage, 'getItem' | 'setItem'>
const memory = new Map<string, unknown[]>()
const cacheKey = (userId: string, program: string) => `truheirs_feed_v1_${userId}_${program}`

export function readFeedCache<T>(userId: string | undefined, program: string | null, storage?: CacheStorage): T[] | null {
  if (!userId || !program) return null
  const key = cacheKey(userId, program)
  const hit = memory.get(key)
  if (hit) return hit as T[]
  try {
    const raw = storage?.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    memory.set(key, parsed)
    return parsed as T[]
  } catch {
    return null
  }
}

export function writeFeedCache<T extends { created_at: string }>(userId: string | undefined, program: string | null, posts: T[], storage?: CacheStorage) {
  if (!userId || !program) return
  const key = cacheKey(userId, program)
  const newest = posts.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, FEED_CACHE_LIMIT)
  memory.set(key, newest)
  try { storage?.setItem(key, JSON.stringify(newest)) } catch { /* storage full: memory copy still works */ }
}

// Only the newest messages render first on phones; earlier ones load on request.
export function visibleMessageWindow<T>(messages: T[], limit: number | null): T[] {
  if (!limit || messages.length <= limit) return messages
  return messages.slice(-limit)
}

// Bulk delete is allowed only when the person may delete every selected message.
export function canDeleteSelection(posts: { id: string; user_id: string }[], selectedIds: string[], userId: string | undefined, isAdminOrOwner: boolean): boolean {
  if (selectedIds.length === 0) return false
  if (isAdminOrOwner) return true
  const selected = new Set(selectedIds)
  const chosen = posts.filter(p => selected.has(p.id))
  return chosen.length === selected.size && chosen.every(p => p.user_id === userId)
}
