// Shared in-memory cache + in-flight de-duplication for expensive reads.
// Prevents the same network call from firing once per mounted component.

type Entry<T> = { value?: T; at: number; inflight?: Promise<T> }

const store = new Map<string, Entry<unknown>>()

export async function cachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
  force = false,
): Promise<T> {
  const existing = store.get(key) as Entry<T> | undefined

  if (!force && existing) {
    if (existing.inflight) return existing.inflight
    if (existing.value !== undefined && Date.now() - existing.at < ttlMs) {
      return existing.value
    }
  }

  const inflight = fn()
    .then((value) => {
      store.set(key, { value, at: Date.now() })
      return value
    })
    .catch((err) => {
      store.delete(key)
      throw err
    })

  store.set(key, { ...(existing ?? { at: 0 }), inflight })
  return inflight
}

export function clearRequestCache(prefix?: string) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
