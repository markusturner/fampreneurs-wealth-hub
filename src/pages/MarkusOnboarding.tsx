import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import logo from '@/assets/famlytics-truheirs-logo.png.asset.json'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { MINIMUM_AGE, SMS_CONSENT_TEXT, ageOn, isAdult } from '@/lib/legal'
import { hasAcceptedTerms, recordLegalConsent } from '@/lib/legal-consent'
import {
  MARKUS_ASSET_TYPES, MARKUS_GOALS, MARKUS_NET_WORTH, MARKUS_TRUST_STATUS,
  markusOnboardedKey, markusOnboardingErrors, markusOnboardingSummary, type MarkusOnboardingAnswers,
} from '@/lib/markus-onboarding'
import { cn } from '@/lib/utils'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition',
        active ? 'border-secondary bg-secondary/15 font-medium text-foreground' : 'border-border bg-card text-muted-foreground hover:border-accent hover:text-foreground')}>
      {active && <Check className="h-3.5 w-3.5 text-secondary" />}{children}
    </button>
  )
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{step}</span>
        <div>
          <h2 className="font-montserrat text-base font-semibold text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function MarkusOnboarding() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [termsDone, setTermsDone] = useState(false)
  const [answers, setAnswers] = useState<MarkusOnboardingAnswers>({ goals: [], assets: [], netWorth: '', trustStatus: '', biggestWorry: '', success90Days: '' })
  const [birthDate, setBirthDate] = useState('')
  const [confirmAge, setConfirmAge] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [sms, setSms] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/auth', { replace: true }); return }
    if ((user as any).user_metadata?.needs_password_setup) { navigate('/setup-login', { replace: true }); return }
    let active = true
    ;(async () => {
      const [{ data }, accepted] = await Promise.all([
        supabase.from('markus_onboarding' as any).select('user_id').eq('user_id', user.id).maybeSingle(),
        hasAcceptedTerms(user.id),
      ])
      if (!active) return
      if (data) { localStorage.setItem(markusOnboardedKey(user.id), '1'); navigate('/markus-ai', { replace: true }); return }
      setTermsDone(accepted)
      setChecking(false)
    })()
    return () => { active = false }
  }, [user, loading, navigate])

  const toggle = (key: 'goals' | 'assets', value: string) =>
    setAnswers((a) => ({ ...a, [key]: a[key].includes(value) ? a[key].filter((v) => v !== value) : [...a[key], value] }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    const formError = markusOnboardingErrors(answers)
    if (formError) { setError(formError); return }
    if (!termsDone) {
      if (ageOn(birthDate) === null) { setError('Please check your date of birth.'); return }
      if (!isAdult(birthDate)) { setError(`You must be ${MINIMUM_AGE} or older to use Markus AI.`); return }
      if (!confirmAge || !acceptTerms) { setError('Please check both required boxes at the bottom.'); return }
      if (sms && phone.replace(/\D/g, '').length < 10) { setError('Enter a valid mobile number for text messages.'); return }
    }
    setSaving(true)
    if (!termsDone) {
      const ok = await recordLegalConsent({ userId: user.id, birthDate, marketing, sms, phone, source: 'markus_onboarding' })
      if (!ok) { setSaving(false); setError('We could not save your choices. Please try again.'); return }
      setTermsDone(true)
    }
    const trimmed = { ...answers, biggestWorry: answers.biggestWorry.trim().slice(0, 1000), success90Days: answers.success90Days.trim().slice(0, 1000) }
    const { error: saveError } = await supabase.from('markus_onboarding' as any).upsert({ user_id: user.id, answers: trimmed, updated_at: new Date().toISOString() })
    if (saveError) { setSaving(false); setError('We could not save your answers. Please try again.'); return }
    await supabase.from('markus_user_knowledge').insert({ user_id: user.id, source_type: 'memory', title: 'My goals for mapping and protecting my assets', content: markusOnboardingSummary(trimmed) })
    localStorage.setItem(markusOnboardedKey(user.id), '1')
    navigate('/markus-ai', { replace: true })
  }

  if (checking) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  }

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background">
      <div className="relative overflow-hidden bg-primary px-5 pb-16 pt-10 text-center text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(var(--secondary)/0.25),transparent_55%)]" />
        <div className="relative mx-auto max-w-2xl">
          <img src={logo.url} alt="Famlytics and TruHeirs" className="mx-auto mb-4 h-14 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Welcome to Markus AI</p>
          <h1 className="mt-3 font-montserrat text-2xl font-bold sm:text-4xl">Let's map and protect what your family owns</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">Answer a few quick questions so Markus knows your goals from your very first chat.</p>
        </div>
      </div>

      <form onSubmit={submit} className="relative mx-auto -mt-10 max-w-2xl space-y-4 px-4 pb-16">
        <Section step={1} title="What do you want Markus to help you with?" hint="Pick all that apply.">
          <div className="flex flex-wrap gap-2">
            {MARKUS_GOALS.map((g) => <Chip key={g} active={answers.goals.includes(g)} onClick={() => toggle('goals', g)}>{g}</Chip>)}
          </div>
        </Section>

        <Section step={2} title="What does your family own today?" hint="Pick all that apply.">
          <div className="flex flex-wrap gap-2">
            {MARKUS_ASSET_TYPES.map((g) => <Chip key={g} active={answers.assets.includes(g)} onClick={() => toggle('assets', g)}>{g}</Chip>)}
          </div>
          <p className="mb-2 mt-5 text-sm font-medium text-foreground">About how much is it all worth? (Optional)</p>
          <div className="flex flex-wrap gap-2">
            {MARKUS_NET_WORTH.map((g) => <Chip key={g} active={answers.netWorth === g} onClick={() => setAnswers((a) => ({ ...a, netWorth: a.netWorth === g ? '' : g }))}>{g}</Chip>)}
          </div>
        </Section>

        <Section step={3} title="Do you have a trust today?">
          <div className="flex flex-wrap gap-2">
            {MARKUS_TRUST_STATUS.map((g) => <Chip key={g} active={answers.trustStatus === g} onClick={() => setAnswers((a) => ({ ...a, trustStatus: g }))}>{g}</Chip>)}
          </div>
        </Section>

        <Section step={4} title="Tell Markus a little more" hint="Optional, but it helps him give better answers.">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mo-worry">What worries you most about your family's money?</Label>
              <Textarea id="mo-worry" maxLength={1000} rows={3} value={answers.biggestWorry} onChange={(e) => setAnswers((a) => ({ ...a, biggestWorry: e.target.value }))} placeholder="For example: if something happened to me, my kids would not know where anything is." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mo-success">What would make the next 90 days a win?</Label>
              <Textarea id="mo-success" maxLength={1000} rows={3} value={answers.success90Days} onChange={(e) => setAnswers((a) => ({ ...a, success90Days: e.target.value }))} placeholder="For example: every asset listed and a clear plan to protect my home." />
            </div>
          </div>
        </Section>

        {!termsDone && (
          <Section step={5} title="Accept the terms">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mo-dob">Date of birth</Label>
                <Input id="mo-dob" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={confirmAge} onCheckedChange={(v) => setConfirmAge(v === true)} className="mt-0.5" />
                <span>I confirm I am {MINIMUM_AGE} or older. (Required)</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" />
                <span>
                  I agree to the <Link to="/terms-of-service" target="_blank" className="underline">Terms of Service</Link>,{' '}
                  <Link to="/privacy-policy" target="_blank" className="underline">Privacy Policy</Link>, and{' '}
                  <Link to="/community-guidelines" target="_blank" className="underline">Community Guidelines</Link>, and I authorize processing of my personal data as described there. (Required)
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
                <span>Send me marketing emails about new programs and events. (Optional)</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} className="mt-0.5" />
                <span>{SMS_CONSENT_TEXT} (Optional)</span>
              </label>
              {sms && (
                <div className="space-y-1.5">
                  <Label htmlFor="mo-phone">Mobile number</Label>
                  <Input id="mo-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}
            </div>
          </Section>
        )}

        {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={saving} className="h-12 w-full gap-2 rounded-full bg-secondary text-base font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <>Meet Markus<ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>
    </div>
  )
}
