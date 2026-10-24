// ============= Full file contents =============
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react' // auth-context-v4
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { initPushNotifications } from '@/lib/push-notifications'
import { clearRequestCache } from '@/lib/request-cache'
import { recoverStoredSession, SESSION_BACKUP_KEY, PERSONAL_SIGN_OUT_SCOPE } from '@/lib/session-persistence'
import { saveDurableBackup, clearDurableBackup, readDurableBackup } from '@/lib/durable-session'

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  phone: string | null
  family_role: string | null
  is_admin: boolean
  is_accountability_partner: boolean
  is_moderator: boolean
  accountability_specialties: string[] | null
  admin_permissions: string[] | null
  program_name: string | null
  membership_type: string | null
  profile_photo_uploaded: boolean
  mailing_address: string | null
  truheirs_access: boolean
  trust_design_booked: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

// Self-healing session backup. The main session key is managed by supabase-js and
// can be wiped when a single token refresh fails (idle device, refresh token
// reuse). We keep a separate copy so an unexpected sign-out can be silently
// healed instead of sending the user to the sign-in page.
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Guards against the same profile being re-fetched on every auth event
  // (INITIAL_SESSION, TOKEN_REFRESHED, etc.) during a page load.
  const lastProfileFetch = useRef<{ userId: string; at: number } | null>(null)

  // Set to true right before a sign-out we caused on purpose (user button,
  // expired program), so the self-healing backup does not resurrect the session.
  const intentionalSignOut = useRef(false)
  const restoreInFlight = useRef<Promise<Session | null> | null>(null)

  const saveSessionBackup = (s: Session | null) => {
    try {
      if (s?.refresh_token) {
        const serialized = JSON.stringify({ refresh_token: s.refresh_token, saved_at: Date.now() })
        localStorage.setItem(SESSION_BACKUP_KEY, serialized)
        saveDurableBackup(serialized)
      } else {
        localStorage.removeItem(SESSION_BACKUP_KEY)
        clearDurableBackup()
      }
    } catch {
      // storage unavailable; ignore
    }
  }

  const clearSessionBackup = () => {
    try {
      localStorage.removeItem(SESSION_BACKUP_KEY)
    } catch {
      // ignore
    }
    clearDurableBackup()
  }

  // Called when supabase-js unexpectedly signs the user out (typically a failed
  // token refresh after a device slept). Try the backed-up refresh token: if the
  // server still accepts it, the user stays signed in with no visible change.
  const tryRestoreSession = async () => {
    if (intentionalSignOut.current) return null
    if (restoreInFlight.current) return restoreInFlight.current
    const attempt = (async () => {
      // An app update can wipe localStorage; reseed it from the durable copy.
      try {
        if (!localStorage.getItem(SESSION_BACKUP_KEY)) {
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            const durable = await readDurableBackup()
            if (durable && !intentionalSignOut.current) localStorage.setItem(SESSION_BACKUP_KEY, durable)
          }
        }
      } catch {
        // storage unavailable; continue with what we have
      }
      const restored = await recoverStoredSession(supabase.auth, localStorage)
      if (!restored && !localStorage.getItem(SESSION_BACKUP_KEY)) clearDurableBackup()
      return restored
    })()
    restoreInFlight.current = attempt
    try { return await attempt } finally { restoreInFlight.current = null }
  }

  const fetchProfile = async (userId: string, force = false) => {
    const last = lastProfileFetch.current
    if (!force && last && last.userId === userId && Date.now() - last.at < 30_000) {
      return
    }
    lastProfileFetch.current = { userId, at: Date.now() }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)

      // Program ended with no TruHeirs subscription: sign out and explain why
      const d: any = data
      const today = new Date().toISOString().slice(0, 10)
      const end: string | null = d?.contract_extension_date || d?.contract_due_date || null
      const paid = !!d?.truheirs_paid_until && d.truheirs_paid_until >= today
      if (d && !d.is_admin && !d.subscription_paused && end && end < today && !paid) {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'owner'])
        if (!roles?.length) {
          sessionStorage.setItem('access_block_reason', `Your program ended on ${end}, so your access is paused. To keep using the TruHeirs software, reach out to us to start your TruHeirs subscription ($247 per quarter).`)
          intentionalSignOut.current = true
          clearSessionBackup()
          await supabase.auth.signOut({ scope: PERSONAL_SIGN_OUT_SCOPE })
          window.location.href = '/auth'
          return
        }
      }


      // Initialize push notifications on native platforms
      initPushNotifications(userId)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, true)
    }
  }

  useEffect(() => {
    let active = true
    const applySession = (current: Session | null) => {
      if (!active) return
      setSession(current)
      setUser(current?.user ?? null)
      if (current) {
        saveSessionBackup(current)
        setTimeout(() => { if (active) void fetchProfile(current.user.id) }, 0)
      } else {
        setProfile(null)
        lastProfileFetch.current = null
        clearRequestCache()
      }
      setLoading(false)
    }
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 2000
    const recover = async () => {
      try {
        const restored = await tryRestoreSession()
        retryDelay = 2000
        applySession(intentionalSignOut.current ? null : restored)
      } catch {
        // Keep the current screen and retry; never treat a network blip as a logout.
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = setTimeout(() => { if (active) void recover() }, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return

        // Redirect to reset-password page on PASSWORD_RECOVERY event
        if (event === 'PASSWORD_RECOVERY' && session) {
          if (window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password'
            return
          }
        }

        if (session) {
          intentionalSignOut.current = false
          applySession(session)
        } else if (event === 'SIGNED_OUT') {
          if (intentionalSignOut.current) {
            applySession(null)
          } else {
            // Route guards must wait until the server accepts or rejects recovery.
            setLoading(true)
            setTimeout(() => { if (active) void recover() }, 0)
          }
        }
      }
    )

    // Check for existing session. When the stored session is gone but a backup
    // exists (the client's own token refresh can fail during init, before the
    // auth listener above registers, so the SIGNED_OUT event may never be seen),
    // attempt the silent restore before giving up and dropping the user on the
    // sign-in page.
    void recover()

    // When the tab wakes up after being idle, refresh a near-expiry token right
    // away so it cannot go stale while the browser throttles background timers.
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data: { session: current } } = await supabase.auth.getSession()
        if (!current) { await recover(); return }
        const secondsLeft = (current.expires_at ?? 0) - Math.floor(Date.now() / 1000)
        if (secondsLeft < 120) {
          await supabase.auth.refreshSession()
        }
      } catch {
        // ignore transient errors; the auth listener heals the session
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    const onOnline = () => { void recover() }
    window.addEventListener('online', onOnline)

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  const signOut = async () => {
    try {
      intentionalSignOut.current = true
      clearSessionBackup()

      // Personal logout does not revoke sessions on other devices.
      try {
        await supabase.auth.signOut({ scope: PERSONAL_SIGN_OUT_SCOPE })
      } catch (err) {
        // Ignore errors
      }

      // Clear this project's local session even if the logout request was offline.
      localStorage.removeItem('sb-tbofkvyezmpovoezjyyl-auth-token')
      // Force page reload for clean state
      window.location.href = '/auth'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if sign out fails
      window.location.href = '/auth'
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
