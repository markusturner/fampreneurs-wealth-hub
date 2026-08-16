import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SetupLogin() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        navigate('/auth', { replace: true })
        return
      }
      setEmail(data.user.email ?? '')
      setLoading(false)
    })()
  }, [navigate])

  // Block leaving the page until credentials are set
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' })
      return
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Type the same password twice.', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      email: email.trim().toLowerCase(),
      password,
      data: { needs_password_setup: false },
    })
    if (error) {
      setSaving(false)
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
      return
    }
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        await supabase.from('profiles').update({ email: email.trim().toLowerCase() } as any).eq('user_id', userData.user.id)
      }
    } catch {
      // non-blocking
    }
    setSaving(false)
    toast({ title: 'You are all set', description: 'Your login is ready.' })
    navigate('/welcome', { replace: true })
  }

  const inputCls =
    'w-full h-11 px-4 rounded-md bg-card border border-border text-card-foreground placeholder:text-muted-foreground outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition'

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Helmet>
        <title>Create Your Login — TruHeirs</title>
        <meta name="description" content="Set your email and password to finish creating your TruHeirs login." />
      </Helmet>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/00df4658-d6df-420b-8c0d-7af68820837d.png" alt="TruHeirs" className="h-20 w-auto mx-auto" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>
        ) : (
          <>
            <div className="text-center mb-6">
              <ShieldCheck className="h-8 w-8 text-secondary mx-auto mb-2" />
              <h1 className="text-xl font-semibold">Create your login</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Confirm your email and set a password so you can sign in any time. This step is required.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={saving}
                className={inputCls}
              />
              <input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={saving}
                className={inputCls}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                disabled={saving}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-md font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Save and continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
