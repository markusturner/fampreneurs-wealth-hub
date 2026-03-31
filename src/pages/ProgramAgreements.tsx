import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, FileText, Loader2, Eye, Calendar, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface ProgramAgreement {
  id: string
  user_id: string
  agreement_type: string
  full_name: string
  mailing_address: string | null
  signature_data: string | null
  signed_at: string
  created_at: string
}

const AGREEMENT_LABELS: Record<string, string> = {
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Family Fortune Mastermind',
  fbu: 'The Family Business University',
  'The Family Vault': 'The Family Vault',
  'The Family Business Accelerator': 'The Family Business Accelerator',
  'The Family Fortune Mastermind': 'The Family Fortune Mastermind',
  'The Family Business University': 'The Family Business University',
}

export default function ProgramAgreements() {
  const navigate = useNavigate()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const [agreements, setAgreements] = useState<ProgramAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProgramAgreement | null>(null)
  const [editing, setEditing] = useState<ProgramAgreement | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', mailing_address: '', agreement_type: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProgramAgreement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isAdminOrOwner) fetchAgreements()
  }, [isAdminOrOwner])

  const fetchAgreements = async () => {
    try {
      const { data, error } = await supabase
        .from('program_agreements')
        .select('*')
        .order('signed_at', { ascending: false })
      if (error) throw error
      setAgreements((data as any[]) || [])
    } catch (err) {
      console.error('Error fetching agreements:', err)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (a: ProgramAgreement) => {
    setEditForm({
      full_name: a.full_name || '',
      mailing_address: a.mailing_address || '',
      agreement_type: a.agreement_type || '',
    })
    setEditing(a)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('program_agreements')
        .update({
          full_name: editForm.full_name,
          mailing_address: editForm.mailing_address || null,
          agreement_type: editForm.agreement_type,
        })
        .eq('id', editing.id)

      if (error) throw error
      toast({ title: 'Updated', description: 'Agreement updated successfully.' })
      setEditing(null)
      setSelected(null)
      fetchAgreements()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('program_agreements')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      toast({ title: 'Deleted', description: 'Agreement deleted.' })
      setDeleteTarget(null)
      setSelected(null)
      fetchAgreements()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!isAdminOrOwner) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-settings")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Program Agreements</h1>
          <p className="text-sm text-muted-foreground">Review all signed program agreements</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Agreement Submissions</CardTitle>
            </div>
            <Badge variant="secondary">{agreements.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : agreements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No program agreements signed yet.</p>
          ) : (
            <div className="space-y-2">
              {agreements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer border border-border/50"
                  onClick={() => setSelected(a)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.full_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {AGREEMENT_LABELS[a.agreement_type] || a.agreement_type}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(a.signed_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(a) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(a) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!selected && !editing && !deleteTarget} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{selected?.full_name} — Agreement Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            {selected && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agreement Type</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{AGREEMENT_LABELS[selected.agreement_type] || selected.agreement_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{selected.full_name}</p>
                </div>
                {selected.mailing_address && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mailing Address</p>
                    <p className="text-sm bg-muted/30 rounded-lg p-3">{selected.mailing_address}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signed At</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">
                    {format(new Date(selected.signed_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                {selected.signature_data && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signature</p>
                    <div className="bg-muted/30 rounded-lg p-3">
                      {selected.signature_data.startsWith('data:image') ? (
                        <img src={selected.signature_data} alt="Signature" className="max-h-24" />
                      ) : (
                        <p className="text-sm italic font-serif text-lg">{selected.signature_data}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (selected) openEdit(selected) }}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => { if (selected) setDeleteTarget(selected) }}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mailing Address</Label>
              <Textarea value={editForm.mailing_address} onChange={e => setEditForm(prev => ({ ...prev, mailing_address: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Agreement Type</Label>
              <Input value={editForm.agreement_type} onChange={e => setEditForm(prev => ({ ...prev, agreement_type: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Agreement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the agreement from <strong>{deleteTarget?.full_name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
