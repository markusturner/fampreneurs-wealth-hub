import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Download, Trash2, Loader2 } from 'lucide-react'
import { LEGAL_DOCUMENT_VERSION, SMS_CONSENT_TEXT } from '@/lib/legal'
import { useUserBlocks } from '@/hooks/useUserBlocks'

type Prefs = { push_enabled: boolean; email_updates: boolean; email_marketing: boolean; sms_enabled: boolean; sms_phone: string | null }
const DEFAULTS: Prefs = { push_enabled: true, email_updates: true, email_marketing: false, sms_enabled: false, sms_phone: null }

export function PrivacyCenter() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [phone, setPhone] = useState('')
  const [exporting, setExporting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const { blockedIds, unblock } = useUserBlocks()
  const [blockedNames, setBlockedNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    supabase.from('communication_preferences').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) { setPrefs({ ...DEFAULTS, ...data }); setPhone(data.sms_phone ?? '') }
    })
  }, [user])

  useEffect(() => {
    const ids = [...blockedIds]
    if (!ids.length) { setBlockedNames({}); return }
    supabase.rpc('get_community_profiles', { p_user_ids: ids }).then(({ data }) => {
      const map: Record<string, string> = {}
      ;(data as { user_id: string; display_name: string }[] | null)?.forEach(p => { map[p.user_id] = p.display_name })
      setBlockedNames(map)
    })
  }, [blockedIds])

  const update = async (patch: Partial<Prefs>, consentType?: 'email_marketing' | 'sms' | 'push') => {
    if (!user) return
    const next = { ...prefs, ...patch }
    if (patch.sms_enabled && phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Add your mobile number first', variant: 'destructive' })
      return
    }
    setPrefs(next)
    const { error } = await supabase.from('communication_preferences').upsert({
      user_id: user.id, ...next, sms_phone: next.sms_enabled ? phone : next.sms_phone, updated_at: new Date().toISOString(),
    })
    if (error) { toast({ title: 'Could not save', variant: 'destructive' }); return }
    if (consentType) {
      const granted = consentType === 'push' ? next.push_enabled : consentType === 'sms' ? next.sms_enabled : next.email_marketing
      await supabase.from('legal_consents').insert({
        user_id: user.id, consent_type: consentType, granted, document_version: LEGAL_DOCUMENT_VERSION, source: 'privacy_center',
        user_agent: navigator.userAgent, metadata: consentType === 'sms' && granted ? { phone, disclosure: SMS_CONSENT_TEXT } : {},
      })
    }
    toast({ title: 'Saved' })
  }

  const exportData = async () => {
    if (!user) return
    setExporting(true)
    const { data: serverData, error } = await supabase.functions.invoke('delete-user', { body: { action: 'export' } })
    // If the server export is unavailable, build the copy from everything this account can read.
    const payload = !error && serverData?.data ? serverData : await exportInBrowser(user.id, user.email ?? null)
    setExporting(false)
    if (!payload) { toast({ title: 'Export failed', description: 'Please try again.', variant: 'destructive' }); return }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `truheirs-my-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ title: 'Your data was downloaded' })
  }

  const deleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    const { data, error } = await supabase.functions.invoke('delete-user', { body: { action: 'delete', confirm: confirmText } })
    if (!error && data?.success) {
      setDeleting(false)
      toast({ title: 'Your account was deleted' })
      await signOut()
      return
    }
    let message = ''
    try { const body = await (error as { context?: Response })?.context?.json(); message = body?.error || '' } catch { /* no body */ }
    if (message.startsWith('Admin and owner accounts')) {
      setDeleting(false)
      toast({ title: 'Account not deleted', description: message, variant: 'destructive' })
      return
    }
    // Fall back to a recorded request that an admin completes (within 30 days).
    const { error: requestError } = await supabase.from('privacy_requests').insert({
      user_id: user.id, request_type: 'delete', status: 'pending', details: { email: user.email, requested_at: new Date().toISOString() },
    })
    setDeleting(false)
    if (requestError) {
      toast({ title: 'Request not sent', description: 'Please email info@fampreneurs.com to delete your account.', variant: 'destructive' })
      return
    }
    toast({ title: 'Deletion requested', description: 'Your account and data will be deleted within 30 days. You are now signed out.' })
    await signOut()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Messages and notifications</CardTitle>
          <CardDescription>Choose what we send you. Security and billing notices are always sent by email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <PrefRow id="pref-push" label="Push notifications" help="Alerts on your phone or computer." checked={prefs.push_enabled} onChange={v => update({ push_enabled: v }, 'push')} />
          <PrefRow id="pref-email-updates" label="Community and program emails" help="New posts, replies, and event reminders." checked={prefs.email_updates} onChange={v => update({ email_updates: v })} />
          <PrefRow id="pref-email-marketing" label="Marketing emails" help="New programs, offers, and events." checked={prefs.email_marketing} onChange={v => update({ email_marketing: v }, 'email_marketing')} />
          <div className="space-y-2">
            <PrefRow id="pref-sms" label="Text messages" help={SMS_CONSENT_TEXT} checked={prefs.sms_enabled} onChange={v => update({ sms_enabled: v }, 'sms')} />
            {!prefs.sms_enabled && (
              <div className="max-w-xs space-y-1">
                <Label htmlFor="pref-sms-phone">Mobile number</Label>
                <Input id="pref-sms-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Download a copy of your information or delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={exportData} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download my data
          </Button>
          <AlertDialog onOpenChange={open => { if (!open) setConfirmText('') }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="profile-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete my account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your login, profile, posts, plans, and saved chats. Billing records we must keep by law stay. If you have an
                  app store subscription, cancel it in your Apple or Google account too. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input id="delete-confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={confirmText !== 'DELETE' || deleting} onClick={e => { e.preventDefault(); deleteAccount() }} className="profile-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? 'Deleting...' : 'Delete forever'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {blockedIds.size > 0 && (
        <Card>
          <CardHeader><CardTitle>Blocked members</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[...blockedIds].map(id => (
                <li key={id} className="flex items-center justify-between gap-3">
                  <span>{blockedNames[id] || 'Member'}</span>
                  <Button variant="outline" size="sm" onClick={() => unblock(id)}>Unblock</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Legal</CardTitle></CardHeader>
        <CardContent>
          <nav aria-label="Legal documents" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link className="underline" to="/privacy-policy">Privacy Policy</Link>
            <Link className="underline" to="/terms-of-service">Terms of Service</Link>
            <Link className="underline" to="/community-guidelines">Community Guidelines</Link>
            <Link className="underline" to="/disclaimer">Disclaimer</Link>
            <Link className="underline" to="/dmca">DMCA / Copyright</Link>
            <Link className="underline" to="/cookie-policy">Cookie Policy</Link>
          </nav>
        </CardContent>
      </Card>
    </div>
  )
}

function PrefRow({ id, label, help, checked, onChange }: { id: string; label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-help`} />
    </div>
  )
}

const BROWSER_EXPORT_TABLES = [
  'profiles', 'communication_preferences', 'legal_consents', 'privacy_requests', 'trust_submissions', 'trust_asset_uploads',
  'family_documents', 'succession_progress', 'handoff_settings', 'investment_portfolios', 'account_transactions', 'business_goals',
  'onboarding_responses', 'program_agreements', 'community_posts', 'community_comments', 'community_reactions', 'chat_projects',
  'chat_conversations', 'ai_chat_history', 'course_enrollments', 'lesson_completions', 'session_attendance', 'survey_submissions',
  'weekly_checkin_responses', 'notifications',
] as const
const SECRET_FIELD = /(token|secret|password|key_hash|api_key|access_key|ssn|cursor)/i

async function exportInBrowser(userId: string, email: string | null) {
  const data: Record<string, unknown> = { account: { id: userId, email } }
  const db = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> } } } }
  for (const table of BROWSER_EXPORT_TABLES) {
    try {
      const { data: rows } = await db.from(table).select('*').eq('user_id', userId).limit(5000)
      if (rows?.length) data[table] = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, SECRET_FIELD.test(k) ? '[removed for security]' : v])))
    } catch { /* skip tables this account cannot read */ }
  }
  await supabase.from('privacy_requests').insert({ user_id: userId, request_type: 'export', status: 'completed' })
  return { exported_at: new Date().toISOString(), data }
}
