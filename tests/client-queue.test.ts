import { test, expect } from 'bun:test'
import { CLIENT_QUEUE_STAGES, clientQueueBuckets, clientQueueStage, isActivatedInvite, isPendingClientInvite } from '../src/lib/client-queue'

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

test("D'Juan's cleared old invite does not appear in Non-Active", () => {
  expect(isPendingClientInvite(false, false)).toBe(false)
})

test('a pending invite still appears in Non-Active before activation', () => {
  expect(isPendingClientInvite(true, false)).toBe(true)
})

test('an active client is not treated as a pending invite', () => {
  expect(isPendingClientInvite(true, true)).toBe(false)
})

test('a named invite with onboarding skipped still shows in Non-Active until they sign up', () => {
  const active = isActivatedInvite({ finishedOnboarding: false, displayName: 'Channell Osorio', contractStartDate: null })
  expect(isPendingClientInvite(true, active)).toBe(true)
})

test('an invite that finished onboarding leaves Non-Active', () => {
  expect(isActivatedInvite({ finishedOnboarding: true, displayName: 'Invited User', contractStartDate: null })).toBe(true)
})

import { duplicateClientIds } from '../src/lib/client-queue'

test('duplicate profiles for the same person keep only the newest program start', () => {
  const hidden = duplicateClientIds([
    { id: 'p-real', user_id: 'u-real', full_name: "D'Juan  Collins", email: 'djuan@x.com', contract_start_date: '2026-11-08', created_at: '2026-10-17T15:47:00Z' },
    { id: 'p-dup', user_id: 'u-dup', full_name: "D'Juan Collins", email: 'DJuan@x.com', contract_start_date: '2026-10-17', created_at: '2026-10-17T17:26:00Z' },
  ])
  expect(hidden.has('p-dup')).toBe(true)
  expect(hidden.has('u-dup')).toBe(true)
  expect(hidden.has('u-real')).toBe(false)
})

test('different people sharing an email are not hidden', () => {
  const hidden = duplicateClientIds([
    { id: 'a', user_id: 'ua', full_name: 'Monica Cardona', email: 'home@x.com', created_at: '2026-01-01' },
    { id: 'b', user_id: 'ub', full_name: 'Hernando Cardona', email: 'home@x.com', created_at: '2026-01-02' },
  ])
  expect(hidden.size).toBe(0)
})
