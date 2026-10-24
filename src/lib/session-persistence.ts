import type { Session } from '@supabase/supabase-js'

export const SESSION_BACKUP_KEY = 'truheirs_session_backup'
export const PERSONAL_SIGN_OUT_SCOPE = 'local' as const

interface RecoveryClient {
  getSession: () => Promise<{ data: { session: Session | null } }>
  refreshSession: (input: { refresh_token: string }) => Promise<{
    data: { session: Session | null }
    error: { status?: number; name?: string } | null
  }>
}

// A backup is only a recovery credential, never proof of authentication.
export async function recoverStoredSession(auth: RecoveryClient, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): Promise<Session | null> {
  const { data } = await auth.getSession()
  if (data.session) return data.session
  let token: string | undefined
  try {
    const raw = storage.getItem(SESSION_BACKUP_KEY)
    token = raw ? JSON.parse(raw)?.refresh_token : undefined
  } catch {
    storage.removeItem(SESSION_BACKUP_KEY)
  }
  if (!token || typeof token !== 'string') return null
  const result = await auth.refreshSession({ refresh_token: token })
  if (result.error) {
    // Offline and server errors must not destroy the recovery credential.
    if (result.error.name === 'AuthRetryableFetchError' || !result.error.status || result.error.status >= 500) {
      throw result.error
    }
    storage.removeItem(SESSION_BACKUP_KEY)
    return null
  }
  const restored = result.data.session
  if (restored) {
    storage.setItem(SESSION_BACKUP_KEY, JSON.stringify({ refresh_token: restored.refresh_token, saved_at: Date.now() }))
  } else {
    storage.removeItem(SESSION_BACKUP_KEY)
  }
  return restored
}