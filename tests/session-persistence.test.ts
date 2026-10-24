import { expect, test } from 'bun:test'
import type { Session } from '@supabase/supabase-js'
import { recoverStoredSession, SESSION_BACKUP_KEY, PERSONAL_SIGN_OUT_SCOPE } from '../src/lib/session-persistence'

const session = { refresh_token: 'rotated-test-token', user: { id: 'test-user' } } as Session
function fixture(error: { status?: number; name?: string } | null = null, existing: Session | null = null) {
  const values = new Map([[SESSION_BACKUP_KEY, JSON.stringify({ refresh_token: 'test-backup' })]])
  let refreshes = 0
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  const auth = { getSession: async () => ({ data: { session: existing } }), refreshSession: async () => { refreshes++; return { data: { session: error ? null : session }, error } } }
  return { auth, storage, refreshes: () => refreshes }
}
test('reloads preserve a valid session without refreshing an older backup', async () => {
  const f = fixture(null, session)
  expect(await recoverStoredSession(f.auth, f.storage)).toBe(session)
  expect(f.refreshes()).toBe(0)
})
test('successful recovery stores the rotated token for the next reload', async () => {
  const f = fixture()
  expect(await recoverStoredSession(f.auth, f.storage)).toBe(session)
  expect(JSON.parse(f.storage.getItem(SESSION_BACKUP_KEY) ?? '{}').refresh_token).toBe('rotated-test-token')
})
test('server-revoked credentials cannot restore a login', async () => {
  const f = fixture({ status: 400 })
  expect(await recoverStoredSession(f.auth, f.storage)).toBeNull()
  expect(f.storage.getItem(SESSION_BACKUP_KEY)).toBeNull()
})
test('offline recovery keeps the backup for another attempt', async () => {
  const f = fixture({ name: 'AuthRetryableFetchError', status: 0 })
  await expect(recoverStoredSession(f.auth, f.storage)).rejects.toMatchObject({ name: 'AuthRetryableFetchError' })
  expect(f.storage.getItem(SESSION_BACKUP_KEY)).not.toBeNull()
})
test('personal logout affects this device rather than every device', () => {
  expect(PERSONAL_SIGN_OUT_SCOPE).toBe('local')
})
test('personal logout clearing the backup prevents recovery', async () => {
  const f = fixture()
  f.storage.removeItem(SESSION_BACKUP_KEY)
  expect(await recoverStoredSession(f.auth, f.storage)).toBeNull()
  expect(f.refreshes()).toBe(0)
})