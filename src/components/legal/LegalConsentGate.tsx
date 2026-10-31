import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LEGAL_DOCUMENT_VERSION, MINIMUM_AGE, SMS_CONSENT_TEXT, ageOn, isAdult, isConsentExemptRoute } from '@/lib/legal'

const acceptedKey = (userId: string) => `legal_consent_${LEGAL_DOCUMENT_VERSION}_${userId}`

/**
 * Asks every signed-in member, once per document version, to confirm age (18+),
 * accept the Terms and Privacy Policy, and choose optional email / text messages.
 * Covers every way an account is created (checkout, invites, admin-created).
 */
export function LegalConsentGate() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [needsConsent, setNeedsConsent] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [confirmAge, setConfirmAge] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [sms, setSms] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) { setNeedsConsent(false); return }
    if (localStorage.getItem(acceptedKey(user.id)) === '1') { setNeedsConsent(false); return }
    supabase.from('legal_consents').select('id')
      .eq('user_id', user.id).eq('consent_type', 'terms_privacy')
      .eq('document_version', LEGAL_DOCUMENT_VERSION).eq('granted', true).limit(1)
      .then(({ data, error: err }) => {
        if (!active || err) return
        if (data && data.length) localStorage.setItem(acceptedKey(user.id), '1')
        setNeedsConsent(!data?.length)
      })
    return () => { active = false }
  }, [user])

  if (!user || !needsConsent || isConsentExemptRoute(pathname)) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const age = ageOn(birthDate)
    if (age === null) { setError('Please check your date of birth and try again.'); return }
    if (!isAdult(birthDate)) {
      setSaving(true)
      await supabase.from('legal_consents').insert({
        user_id: user.id, consent_type: 'age_18_plus', granted: false,
        document_version: LEGAL_DOCUMENT_VERSION, source: 'consent_gate', user_agent: navigator.userAgent,
      })
      setBlocked(true)
      setSaving(false)
      return
    }
    if (!acceptTerms || !confirmAge) { setError('Please check both required boxes.'); return }
    if (sms && phone.replace(/\D/g, '').length < 10) { setError('Enter a valid mobile number for text messages.'); return }
    setSaving(true)
    const base = { user_id: user.id, document_version: LEGAL_DOCUMENT_VERSION, source: 'consent_gate', user_agent: navigator.userAgent, metadata: {} }
    const { error: insertError } = await supabase.from('legal_consents').insert([
      { ...base, consent_type: 'terms_privacy', granted: true },
      { ...base, consent_type: 'age_18_plus', granted: true, metadata: { birth_date: birthDate } },
      { ...base, consent_type: 'email_marketing', granted: marketing },
      { ...base, consent_type: 'sms', granted: sms, metadata: sms ? { phone, disclosure: SMS_CONSENT_TEXT } : {} },
    ])
    if (!insertError) {
      await supabase.from('communication_preferences').upsert({
        user_id: user.id, email_marketing: marketing, sms_enabled: sms, sms_phone: sms ? phone : null, updated_at: new Date().toISOString(),
      })
      localStorage.setItem(acceptedKey(user.id), '1')
      setNeedsConsent(false)
    } else {
      setError('We could not save your choices. Please try again.')
    }
    setSaving(false)
  }

  return (
    <Dialog open>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg [&>button]:hidden" onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()}>
        {blocked ? (
          <>
            <DialogHeader>
              <DialogTitle>TruHeirs is for adults only</DialogTitle>
              <DialogDescription>You must be {MINIMUM_AGE} or older to use TruHeirs, so we can't open this account.</DialogDescription>
            </DialogHeader>
            <Button onClick={() => signOut()}>Sign out</Button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Before you continue</DialogTitle>
              <DialogDescription>Please review and accept our updated terms.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="consent-dob">Date of birth</Label>
              <Input id="consent-dob" type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={confirmAge} onCheckedChange={v => setConfirmAge(v === true)} className="mt-0.5" aria-describedby="consent-age-text" />
              <span id="consent-age-text">I confirm I am {MINIMUM_AGE} or older. (Required)</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={acceptTerms} onCheckedChange={v => setAcceptTerms(v === true)} className="mt-0.5" aria-describedby="consent-terms-text" />
              <span id="consent-terms-text">
                I agree to the <Link to="/terms-of-service" target="_blank" className="underline">Terms of Service</Link>,{' '}
                <Link to="/privacy-policy" target="_blank" className="underline">Privacy Policy</Link>, and{' '}
                <Link to="/community-guidelines" target="_blank" className="underline">Community Guidelines</Link>, and I authorize processing of my personal data as described there. (Required)
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={marketing} onCheckedChange={v => setMarketing(v === true)} className="mt-0.5" />
              <span>Send me marketing emails about new programs and events. (Optional)</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={sms} onCheckedChange={v => setSms(v === true)} className="mt-0.5" />
              <span>{SMS_CONSENT_TEXT} (Optional)</span>
            </label>
            {sms && (
              <div className="space-y-1.5">
                <Label htmlFor="consent-phone">Mobile number</Label>
                <Input id="consent-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-[#ffb500] text-[#290a52] hover:bg-[#2eb2ff] hover:text-white" disabled={saving}>{saving ? 'Saving...' : 'Agree and continue'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
