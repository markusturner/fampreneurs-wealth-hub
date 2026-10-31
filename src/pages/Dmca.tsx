import { useState } from 'react'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PRIVACY_CONTACT_EMAIL } from '@/lib/legal'

const empty = { name: '', email: '', address: '', work: '', location: '', signature: '' }

const Dmca = () => {
  const [form, setForm] = useState(empty)
  const [noticeType, setNoticeType] = useState<'takedown' | 'counter'>('takedown')
  const [goodFaith, setGoodFaith] = useState(false)
  const [accurate, setAccurate] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goodFaith || !accurate) return
    setStatus('sending')
    const { error } = await supabase.from('dmca_notices').insert({
      complainant_name: form.name.trim(),
      complainant_email: form.email.trim(),
      complainant_address: form.address.trim() || null,
      copyrighted_work: form.work.trim(),
      infringing_location: form.location.trim(),
      signature: form.signature.trim(),
      notice_type: noticeType,
      good_faith_statement: goodFaith,
      accuracy_statement: accurate,
    })
    setStatus(error ? 'error' : 'sent')
    if (!error) { setForm(empty); setGoodFaith(false); setAccurate(false) }
  }

  return (
    <LegalPageLayout title="DMCA Copyright Policy" path="/dmca" description="How to report copyright infringement on TruHeirs and how to send a counter-notice.">
      <section>
        <h2>Takedown process</h2>
        <p>
          If you believe content on TruHeirs infringes your copyright, send a notice using the form below or email {PRIVACY_CONTACT_EMAIL}
          with the subject "DMCA Notice." We review notices promptly, remove or disable infringing content, tell the person who posted it,
          and close the accounts of repeat infringers.
        </p>
        <p>
          If your content was removed and you believe it was a mistake or you have permission to use it, you can send a counter-notice. Unless the
          person who complained files a court action within 10 to 14 business days, we may restore the content.
        </p>
        <p>Designated agent: Copyright Agent, VNCI, LLC, 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318, {PRIVACY_CONTACT_EMAIL}.</p>
      </section>

      <section aria-labelledby="dmca-form-title">
        <h2 id="dmca-form-title">Send a notice</h2>
        {status === 'sent' ? (
          <p role="status" className="rounded-md border border-border bg-muted p-4 text-foreground">Thank you. We received your notice and will reply by email.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <fieldset className="flex gap-4">
              <legend className="mb-2 text-sm font-medium text-foreground">Notice type</legend>
              {(['takedown', 'counter'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 text-foreground">
                  <input type="radio" name="notice_type" value={t} checked={noticeType === t} onChange={() => setNoticeType(t)} />
                  {t === 'takedown' ? 'Takedown notice' : 'Counter-notice'}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="dmca-name">Full legal name</Label><Input id="dmca-name" required value={form.name} onChange={set('name')} /></div>
              <div><Label htmlFor="dmca-email">Email</Label><Input id="dmca-email" type="email" required value={form.email} onChange={set('email')} /></div>
            </div>
            <div><Label htmlFor="dmca-address">Mailing address and phone</Label><Input id="dmca-address" value={form.address} onChange={set('address')} /></div>
            <div><Label htmlFor="dmca-work">Describe the copyrighted work</Label><Textarea id="dmca-work" required value={form.work} onChange={set('work')} /></div>
            <div><Label htmlFor="dmca-location">Where is the content on TruHeirs? (link or description)</Label><Textarea id="dmca-location" required value={form.location} onChange={set('location')} /></div>
            <label className="flex items-start gap-2 text-foreground">
              <Checkbox checked={goodFaith} onCheckedChange={v => setGoodFaith(v === true)} aria-label="Good faith statement" className="mt-0.5" />
              <span>{noticeType === 'takedown'
                ? 'I believe in good faith that this use is not authorized by the copyright owner, its agent, or the law.'
                : 'I believe in good faith that the content was removed by mistake or misidentification, and I consent to the jurisdiction of the federal court for my address.'}</span>
            </label>
            <label className="flex items-start gap-2 text-foreground">
              <Checkbox checked={accurate} onCheckedChange={v => setAccurate(v === true)} aria-label="Accuracy statement" className="mt-0.5" />
              <span>Under penalty of perjury, the information in this notice is accurate{noticeType === 'takedown' ? ' and I am the owner or authorized to act for the owner' : ''}.</span>
            </label>
            <div><Label htmlFor="dmca-signature">Electronic signature (type your full name)</Label><Input id="dmca-signature" required value={form.signature} onChange={set('signature')} /></div>
            {status === 'error' && <p role="alert" className="text-destructive">We could not send your notice. Please email {PRIVACY_CONTACT_EMAIL}.</p>}
            <Button type="submit" disabled={!goodFaith || !accurate || status === 'sending'}>{status === 'sending' ? 'Sending...' : 'Send notice'}</Button>
          </form>
        )}
      </section>
    </LegalPageLayout>
  )
}

export default Dmca
