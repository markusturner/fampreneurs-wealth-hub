import { expect, test } from 'bun:test'
import { analyzeChats } from '../src/lib/markus-chat-analytics'

test('top problems are ranked by how many client questions mention them, max 5', () => {
  const now = new Date('2026-10-31T12:00:00Z')
  const at = '2026-10-30T12:00:00Z'
  const rows = [
    { user_id: 'a', role: 'user', content: 'How do I set up an irrevocable trust?', created_at: at },
    { user_id: 'b', role: 'user', content: 'Should my trust own my LLC?', created_at: at },
    { user_id: 'a', role: 'user', content: 'What about taxes?', created_at: at },
    { user_id: 'a', role: 'assistant', content: 'trust trust trust', created_at: at },
  ]
  const r = analyzeChats(rows, now)
  expect(r.totalQuestions).toBe(3)
  expect(r.totalClients).toBe(2)
  expect(r.topTopics[0]).toMatchObject({ label: 'Setting up trusts', count: 2 })
  expect(r.topTopics.length).toBeLessThanOrEqual(5)
})

import { chatCommunities, voiceCallIds } from '../src/lib/markus-chat-analytics'
test('chat logs label each member by community, including Markus AI', () => {
  expect(chatCommunities('Markus AI')).toEqual(['Markus AI'])
  expect(chatCommunities('The Private Estate Accelerator, Markus AI')).toEqual(['Markus AI', 'PEA'])
  expect(chatCommunities('The Trust Vault')).toEqual(['TTV'])
  expect(chatCommunities('The Family Legacy: VIP Weekend')).toEqual(['VIP'])
  expect(chatCommunities(null)).toEqual(['Other'])
})
test('a thread counts as a voice call only when a message came from a voice call', () => {
  const ids = voiceCallIds([{ conversation_id: 'a', metadata: { source: 'voice' } }, { conversation_id: 'a', metadata: {} }, { conversation_id: 'b', metadata: { persona: 'rachel' } }])
  expect([...ids]).toEqual(['a'])
})
