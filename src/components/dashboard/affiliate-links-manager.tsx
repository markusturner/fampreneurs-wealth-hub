import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Copy, Loader2, Plus, Trash2, Users, MousePointerClick } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AffiliateLink {
  id: string
  code: string
  recipient_name: string
  recipient_email: string | null
  target_url: string
  notes: string | null
  owner_id: string
  created_at: string
}

interface Stats {
  clicks: number
  signups: number
}

const SITE_BASE = typeof window !== 'undefined' ? window.location.origin : ''

function buildLink(code: string) {
  return `${SITE_BASE}/?ref=${encodeURIComponent(code)}`
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4)
}

export function AffiliateLinksManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ title: 'Failed to load links', description: error.message, variant: 'destructive' })
      setLoading(false)
      return
    }

    const list = (data || []) as AffiliateLink[]
    setLinks(list)

    // Fetch stats for each code
    const codes = list.map(l => l.code)
    if (codes.length) {
      const [{ data: clicks }, { data: signups }] = await Promise.all([
        supabase.from('page_views').select('ref_code').in('ref_code', codes),
        supabase.from('affiliate_signups').select('code').in('code', codes),
      ])
      const next: Record<string, Stats> = {}
      codes.forEach(c => { next[c] = { clicks: 0, signups: 0 } })
      ;(clicks || []).forEach((r: any) => { if (r.ref_code && next[r.ref_code]) next[r.ref_code].clicks++ })
      ;(signups || []).forEach((r: any) => { if (r.code && next[r.code]) next[r.code].signups++ })
      setStats(next)
    } else {
      setStats({})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!recipientName.trim()) {
      toast({ title: 'Recipient name required', variant: 'destructive' })
      return
    }
    if (!user?.id) return
    setSaving(true)
    const code = (customCode.trim() || randomCode()).toLowerCase().replace(/[^a-z0-9-]/g, '')
    const { error } = await supabase.from('affiliate_links').insert({
      owner_id: user.id,
      code,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Failed to create link', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Affiliate link created' })
    setRecipientName(''); setRecipientEmail(''); setCustomCode(''); setNotes('')
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this affiliate link? Stats will remain but the code will no longer be listed.')) return
    const { error } = await supabase.from('affiliate_links').delete().eq('id', id)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Affiliate Link</CardTitle>
          <CardDescription>
            Create trackable referral links to share with anyone outside the program. Each click and signup will be counted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Recipient Name *</Label>
              <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-1">
              <Label>Recipient Email</Label>
              <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Custom Code (optional)</Label>
              <Input value={customCode} onChange={e => setCustomCode(e.target.value)} placeholder="auto-generated if blank" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context for this link" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Affiliate Links</CardTitle>
          <CardDescription>Visits and signups attributed to each code.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No affiliate links yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right"><MousePointerClick className="h-4 w-4 inline mr-1" />Visits</TableHead>
                    <TableHead className="text-right"><Users className="h-4 w-4 inline mr-1" />Signups</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map(link => {
                    const s = stats[link.code] || { clicks: 0, signups: 0 }
                    const url = buildLink(link.code)
                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="font-medium">{link.recipient_name}</div>
                          {link.recipient_email && <div className="text-xs text-muted-foreground">{link.recipient_email}</div>}
                          {link.notes && <div className="text-xs text-muted-foreground italic">{link.notes}</div>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{link.code}</TableCell>
                        <TableCell className="text-right font-semibold">{s.clicks}</TableCell>
                        <TableCell className="text-right font-semibold">{s.signups}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          <span className="text-xs text-muted-foreground">{url}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="outline" size="icon" onClick={() => copy(url)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(link.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
