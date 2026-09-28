// ============= Full file contents =============
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react' // auth-context-v4
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { initPushNotifications } from '@/lib/push-notifications'
import { clearRequestCache } from '@/lib/request-cache'

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
const SESSION_BACKUP_KEY = 'truheirs_session_backup'

const isPublicAuthPath = () => {
  if (typeof window === 'undefined') return true
  const p = window.location.pathname
  return (
    p.startsWith('/auth') ||
    p === '/signup' ||
    p.startsWith('/reset-password') ||
    p.startsWith('/setup-login') ||
    p.startsWith('/invite/') ||
    p === '/'
  )
}

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
  const lastRestoreAttempt = useRef(0)

  const saveSessionBackup = (s: Session | null) => {
    try {
      if (s?.refresh_token) {
        localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify({ refresh_token: s.refresh_token, saved_at: Date.now() }))
      } else {
        localStorage.removeItem(SESSION_BACKUP_KEY)
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
  }

  // Called when supabase-js unexpectedly signs the user out (typically a failed
  // token refresh after a device slept). Try the backed-up refresh token: if the
  // server still accepts it, the user stays signed in with no visible change.
  const tryRestoreSession = async () => {
    if (isPublicAuthPath()) return
    if (Date.now() - lastRestoreAttempt.current < 30_000) return
    lastRestoreAttempt.current = Date.now()

    let backup: { refresh_token?: string } | null = null
    try {
      const raw = localStorage.getItem(SESSION_BACKUP_KEY)
      if (raw) backup = JSON.parse(raw)
    } catch {
      backup = null
    }
    if (!backup?.refresh_token) {
      clearSessionBackup()
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession({
        refresh_token: backup.refresh_token,
      })
      if (error || !session) {
        clearSessionBackup()
        return
      }
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data?.user) {
        await supabase.auth.signOut().catch(() => {})
        clearSessionBackup()
        return
      }
      saveSessionBackup(session)
    } catch {
      clearSessionBackup()
    }
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
          await supabase.auth.signOut()
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // Redirect to reset-password page on PASSWORD_RECOVERY event
        if (event === 'PASSWORD_RECOVERY' && session) {
          if (window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password'
            return
          }
        }

        // Keep the self-healing backup fresh on every signed-in event
        if (session) {
          saveSessionBackup(session)
        } else if (event === 'SIGNED_OUT' && !intentionalSignOut.current) {
          // supabase-js dropped the session on its own (failed refresh, stale
          // token after sleep). Try to silently restore before giving up.
          setTimeout(() => {
            void tryRestoreSession()
          }, 0)
        }

        // Defer profile fetching to prevent deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id)
          }, 0)
        } else {
          setProfile(null)
          lastProfileFetch.current = null
          clearRequestCache()
        }

        setLoading(false)
      }
    )

    // Check for existing session. When the stored session is gone but a backup
    // exists (the client's own token refresh can fail during init, before the
    // auth listener above registers, so the SIGNED_OUT event may never be seen),
    // attempt the silent restore before giving up and dropping the user on the
    // sign-in page.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        try {
          const raw = localStorage.getItem(SESSION_BACKUP_KEY)
          if (raw) {
            const backup = JSON.parse(raw) as { refresh_token?: string }
            if (backup?.refresh_token) {
              const attempt = tryRestoreSession()
              const timeout = new Promise((resolve) => setTimeout(resolve, 8000))
              await Promise.race([attempt, timeout])
              const { data: { session: after } } = await supabase.auth.getSession()
              session = after
            }
          }
        } catch {
          // Ignore malformed backups; fall through to the signed-out state.
        }
      }
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id)
        }, 0)
      }

      setLoading(false)
    })

    // When the tab wakes up after being idle, refresh a near-expiry token right
    // away so it cannot go stale while the browser throttles background timers.
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data: { session: current } } = await supabase.auth.getSession()
        if (!current) return
        const secondsLeft = (current.expires_at ?? 0) - Math.floor(Date.now() / 1000)
        if (secondsLeft < 120) {
          await supabase.auth.refreshSession()
        }
      } catch {
        // ignore transient errors; the auth listener heals the session
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const signOut = async () => {
    try {
      intentionalSignOut.current = true
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
      clearSessionBackup()

      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        // Ignore errors
      }

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
