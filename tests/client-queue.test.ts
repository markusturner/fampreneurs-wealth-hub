import { test, expect } from 'bun:test'
import { CLIENT_QUEUE_STAGES, clientQueueBuckets, clientQueueStage, isActivatedInvite, isPendingClientInvite, programRanOut } from '../src/lib/client-queue'

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

const NOV_11_2026 = new Date('2026-11-11T12:00:00')

test('a yearly Trust Vault client past 365 days with no extension goes back to Non-Active', () => {
  expect(programRanOut({ programName: 'The Trust Vault', startDate: '2025-10-02', dueDate: '2026-10-02', extensionDate: null }, NOV_11_2026)).toBe(true)
})

test('a Trust Vault client under 365 days stays in their stage', () => {
  expect(programRanOut({ programName: 'The Trust Vault', startDate: '2025-12-16', dueDate: '2026-12-16', extensionDate: null }, NOV_11_2026)).toBe(false)
})

test('a new 16-week Trust Vault member is not moved by the 365-day rule', () => {
  expect(programRanOut({ programName: 'The Trust Vault', startDate: '2025-01-01', dueDate: '2025-04-23', extensionDate: null }, NOV_11_2026)).toBe(false)
})

test('a Private Estate Accelerator client past 90 days with no extension goes back to Non-Active', () => {
  expect(programRanOut({ programName: 'The Private Estate Accelerator', startDate: '2026-08-12', dueDate: '2026-12-10', extensionDate: null }, NOV_11_2026)).toBe(true)
})

test('a Private Estate Accelerator client under 90 days stays in their stage', () => {
  expect(programRanOut({ programName: 'The Private Estate Accelerator', startDate: '2026-09-26', dueDate: '2026-12-26', extensionDate: null }, NOV_11_2026)).toBe(false)
})

test('an extension date keeps an expired client out of Non-Active', () => {
  expect(programRanOut({ programName: 'The Trust Vault', startDate: '2024-12-12', dueDate: '2025-12-12', extensionDate: '2026-06-12' }, NOV_11_2026)).toBe(false)
})
