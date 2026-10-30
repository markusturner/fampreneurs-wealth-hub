import { test, expect } from 'bun:test'
import { CLIENT_QUEUE_STAGES, clientQueueBuckets, clientQueueStage } from '../src/lib/client-queue'

// Continuity, Follow-up and Deal Lost are no longer queue columns, but stored
// overrides with those values must still bucket safely instead of crashing.
test('legacy follow_up and deal_lost overrides still bucket without breaking the queue', () => {
  const buckets = clientQueueBuckets<string>()
  buckets[clientQueueStage('invited', 'follow_up')].push('pending-client')
  buckets[clientQueueStage('invited', 'deal_lost')].push('lost-client')
  expect(buckets.follow_up).toEqual(['pending-client'])
  expect(buckets.deal_lost).toEqual(['lost-client'])
  expect(buckets.invited).toEqual([])
})

test('legacy continuity override still buckets without breaking the queue', () => {
  const buckets = clientQueueBuckets<string>()
  buckets[clientQueueStage('stable', 'continuity')].push('continuity-client')
  expect(buckets.continuity).toEqual(['continuity-client'])
  expect(buckets.stable).toEqual([])
})

test('clearing a manual queue stage restores automatic health placement', () => {
  expect(clientQueueStage('slipping', null)).toBe('slipping')
})
