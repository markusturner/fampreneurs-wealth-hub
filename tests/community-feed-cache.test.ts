import { describe, expect, test } from 'bun:test'
import { canDeleteSelection, readFeedCache, visibleMessageWindow, writeFeedCache } from '../src/lib/community-feed-cache'

const posts = [
  { id: 'a', user_id: 'me', created_at: '2026-10-01T00:00:00Z' },
  { id: 'b', user_id: 'other', created_at: '2026-10-02T00:00:00Z' },
  { id: 'c', user_id: 'me', created_at: '2026-10-03T00:00:00Z' },
]

describe('community feed', () => {
  test('phones render only the newest messages first', () => {
    expect(visibleMessageWindow(posts, 2).map(p => p.id)).toEqual(['b', 'c'])
    expect(visibleMessageWindow(posts, null).length).toBe(3)
  })

  test('cached messages come back for the same person and community only', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
    writeFeedCache('u1', 'tfv-test', posts, storage)
    expect(readFeedCache<typeof posts[0]>('u1', 'tfv-test', storage)?.length).toBe(3)
    expect(readFeedCache('u2', 'tfv-test', storage)).toBeNull()
  })

  test('members can bulk delete only their own messages', () => {
    expect(canDeleteSelection(posts, ['a', 'c'], 'me', false)).toBe(true)
    expect(canDeleteSelection(posts, ['a', 'b'], 'me', false)).toBe(false)
    expect(canDeleteSelection(posts, ['a', 'b'], 'me', true)).toBe(true)
    expect(canDeleteSelection(posts, [], 'me', true)).toBe(false)
  })
})
