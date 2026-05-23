import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { ExternalLink, Loader2, Sparkles, type LucideIcon } from "lucide-react"
import type { ProgressStatus } from "./SuccessionItemCard"

interface UpsellInfo {
  label: string
  detail: string
}

interface Props {
  itemKey: string
  label: string
  description: string
  icon: LucideIcon
  status: ProgressStatus
  notes?: string | null
  bookingUrl?: string
  bookingComingSoon?: boolean
  upsell?: UpsellInfo
  doneForYou?: boolean
  children?: React.ReactNode
  onChanged: () => void
}

const STATUS_OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
]

export function SuccessionItemDetail({
  itemKey,
  label,
  description,
  icon: Icon,
  status,
  notes,
  bookingUrl,
  bookingComingSoon,
  upsell,
  doneForYou,
  children,
  onChanged,
}: Props) {
  const { user } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [editStatus, setEditStatus] = useState<ProgressStatus>(status)
  const [editNotes, setEditNotes] = useState(notes ?? '')
  const [requesting, setRequesting] = useState(false)

  const saveStatus = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('succession_progress')
        .upsert({ user_id: user.id, item_key: itemKey, status: editStatus, notes: editNotes }, { onConflict: 'user_id,item_key' })
      if (error) throw error
      toast({ title: 'Status updated' })
      onChanged()
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const requestUpsell = async () => {
    setRequesting(true)
    try {
      await supabase.functions.invoke('notify-admin-submission', {
        body: { type: 'succession_upsell_request', item_key: itemKey, label, upsell: upsell?.label },
      })
      toast({ title: 'Request sent', description: 'An admin will reach out shortly.' })
    } catch (err: any) {
      toast({ title: 'Failed to send request', description: err.message, variant: 'destructive' })
    } finally {
      setRequesting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-accent" />
          {label}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {doneForYou && (
          <Alert className="border-[#290a52]/30 bg-[#290a52]/5">
            <Sparkles className="h-4 w-4 text-[#290a52]" />
            <AlertDescription className="text-sm">
              <strong>Done-for-you service.</strong> Our team handles this for you. Track progress below.
            </AlertDescription>
          </Alert>
        )}

        {bookingUrl && !bookingComingSoon && (
          <Button asChild className="gap-2">
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              Book your session <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {bookingComingSoon && (
          <Button disabled variant="outline">Booking link coming soon</Button>
        )}

        {upsell && (
          <Alert className="border-[#ffb500]/40 bg-[#ffb500]/10">
            <AlertDescription className="text-sm space-y-2">
              <div><strong>{upsell.label}</strong></div>
              <div>{upsell.detail}</div>
              <Button size="sm" onClick={requestUpsell} disabled={requesting} className="gap-2">
                {requesting && <Loader2 className="h-3 w-3 animate-spin" />}
                Request this service
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {children}

        {doneForYou && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Progress Tracker</h4>
            <Badge variant="outline">{STATUS_OPTIONS.find(o => o.value === status)?.label}</Badge>
          </div>
          {isAdminOrOwner ? (
            <>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProgressStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Admin notes (optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
              <Button onClick={saveStatus} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Status
              </Button>
            </>
          ) : (
            <>
              {notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>}
              <p className="text-xs text-muted-foreground">Status updates are managed by the TruHeirs team.</p>
            </>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
