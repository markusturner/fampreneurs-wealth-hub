import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Clock, HeartHandshake, Loader2, ShieldCheck } from 'lucide-react'

const CHECKLIST = [
  { key: 'documents', label: 'Core legal documents uploaded' },
  { key: 'accounts', label: 'All accounts assigned to an entity' },
  { key: 'successor', label: 'Successor contact confirmed' },
  { key: 'instructions', label: 'Written handoff instructions recorded' },
  { key: 'family_meeting', label: 'Family meeting held with next generation' },
  { key: 'access', label: 'Access credentials stored securely' },
]

interface Settings {
  checkin_interval_days: number
  grace_period_days: number
  last_checkin_at: string
  successor_name: string
  successor_email: string
  successor_phone: string
  release_enabled: boolean
  checklist: Record<string, boolean>
}

const DEFAULTS: Settings = {
  checkin_interval_days: 30,
  grace_period_days: 14,
  last_checkin_at: new Date().toISOString(),
  successor_name: '',
  successor_email: '',
  successor_phone: '',
  release_enabled: false,
  checklist: {},
}

const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000)

export function HandoffPanel() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase
        .from('handoff_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setSettings({
          checkin_interval_days: data.checkin_interval_days,
          grace_period_days: data.grace_period_days,
          last_checkin_at: data.last_checkin_at,
          successor_name: data.successor_name || '',
          successor_email: data.successor_email || '',
          successor_phone: data.successor_phone || '',
          release_enabled: data.release_enabled,
          checklist: (data.checklist as Record<string, boolean>) || {},
        })
      }
      setLoading(false)
    })()
  }, [user?.id])

  const save = async (next: Partial<Settings>, message?: string) => {
    if (!user?.id) return
    const merged = { ...settings, ...next }
    setSettings(merged)
    setSaving(true)
    const { error } = await supabase
      .from('handoff_settings')
      .upsert({ user_id: user.id, ...merged }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
      return
    }
    if (message) toast({ title: message })
  }

  const stats = useMemo(() => {
    const last = new Date(settings.last_checkin_at)
    const since = Math.max(daysBetween(new Date(), last), 0)
    const due = Math.max(settings.checkin_interval_days - since, 0)
    const overdue = since > settings.checkin_interval_days
    const releaseIn = Math.max(settings.checkin_interval_days + settings.grace_period_days - since, 0)
    return { since, due, overdue, releaseIn, last }
  }, [settings])

  const doneCount = CHECKLIST.filter(i => settings.checklist[i.key]).length
  const readiness = Math.round((doneCount / CHECKLIST.length) * 100)

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Last check-in</p>
            <p className="text-2xl font-bold mt-1">{stats.since}d ago</p>
            <p className="text-xs text-muted-foreground">{stats.last.toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><HeartHandshake className="h-3 w-3" /> Next check-in</p>
            <p className="text-2xl font-bold mt-1">{stats.overdue ? 'Overdue' : `in ${stats.due}d`}</p>
            <p className="text-xs text-muted-foreground">Every {settings.checkin_interval_days} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Release status</p>
            <p className="text-2xl font-bold mt-1">
              {settings.release_enabled ? (stats.releaseIn === 0 ? 'Ready' : `${stats.releaseIn}d`) : 'Off'}
            </p>
            <p className="text-xs text-muted-foreground">
              {settings.release_enabled ? `Grace period ${settings.grace_period_days} days` : 'Enable below'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={() => save({ last_checkin_at: new Date().toISOString() }, "You're checked in")} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          I'm still here — check in
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Release settings</CardTitle>
            <CardDescription>Who receives the family record if you stop checking in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Successor name</Label>
                <Input
                  value={settings.successor_name}
                  onChange={e => setSettings(s => ({ ...s, successor_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Successor email</Label>
                <Input
                  type="email"
                  value={settings.successor_email}
                  onChange={e => setSettings(s => ({ ...s, successor_email: e.target.value }))}
                  placeholder="name@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Successor phone</Label>
                <Input
                  value={settings.successor_phone}
                  onChange={e => setSettings(s => ({ ...s, successor_phone: e.target.value }))}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Check-in every</Label>
                <Select
                  value={String(settings.checkin_interval_days)}
                  onValueChange={v => setSettings(s => ({ ...s, checkin_interval_days: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Grace period</Label>
                <Select
                  value={String(settings.grace_period_days)}
                  onValueChange={v => setSettings(s => ({ ...s, grace_period_days: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable handoff release</p>
                <p className="text-xs text-muted-foreground">Notify your successor after the grace period ends.</p>
              </div>
              <Switch
                checked={settings.release_enabled}
                onCheckedChange={v => setSettings(s => ({ ...s, release_enabled: v }))}
              />
            </div>

            <Button className="w-full" onClick={() => save({}, 'Handoff settings saved')} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Handoff readiness</span>
              <Badge variant="outline">{readiness}%</Badge>
            </CardTitle>
            <CardDescription>Complete each step so the next generation inherits clarity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={readiness} className="h-2" />
            <div className="space-y-1">
              {CHECKLIST.map(item => (
                <label key={item.key} className="flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={!!settings.checklist[item.key]}
                    onCheckedChange={v =>
                      save({ checklist: { ...settings.checklist, [item.key]: !!v } })
                    }
                  />
                  <span className={`text-sm ${settings.checklist[item.key] ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
