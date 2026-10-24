import { expect, test } from 'bun:test'
import { chronologicalMessages } from '../src/lib/community-message-order'

test('newest messages stay at the bottom even when pinned', () => {
  const messages = [
    { id: 'new', created_at: '2026-10-24T04:38:00Z', pinned: true },
    { id: 'old', created_at: '2026-10-23T04:38:00Z', pinned: false },
    { id: 'middle', created_at: '2026-10-24T03:38:00Z', pinned: false },
  ]
  expect(chronologicalMessages(messages).map(p => p.id)).toEqual(['old', 'middle', 'new'])
  expect(messages[0].id).toBe('new')
})