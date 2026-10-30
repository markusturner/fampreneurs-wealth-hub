import { test, expect } from 'bun:test'
import { CLIENT_QUEUE_STAGES, clientQueueBuckets, clientQueueStage } from '../src/lib/client-queue'

test('Follow-up is an available queue stage and preserves a manual placement over automatic health', () => {
  expect(CLIENT_QUEUE_STAGES).toContain('follow_up')
  expect(clientQueueStage('expansion_ready', 'follow_up')).toBe('follow_up')
  const buckets = clientQueueBuckets<string>()
  buckets[clientQueueStage('invited', 'follow_up')].push('pending-client')
  expect(buckets.follow_up).toEqual(['pending-client'])
  expect(buckets.invited).toEqual([])
})

test('Deal Lost is an available queue stage and preserves a manual placement over automatic health', () => {
  expect(CLIENT_QUEUE_STAGES).toContain('deal_lost')
  expect(clientQueueStage('stable', 'deal_lost')).toBe('deal_lost')
  const buckets = clientQueueBuckets<string>()
  buckets[clientQueueStage('invited', 'deal_lost')].push('pending-client')
  expect(buckets.deal_lost).toEqual(['pending-client'])
  expect(buckets.invited).toEqual([])
})

test('clearing a manual queue stage restores automatic health placement', () => {
  expect(clientQueueStage('slipping', null)).toBe('slipping')
})