import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Data {
  name: string; role: string | null; deadline: string; status: string; progress: number
  steps: Record<string, boolean>; stepList: { key: string; label: string }[]; ownerName: string
}

export default function HandoffAccept() {
  const { token } = useParams()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.functions.invoke('handoff-accept', { body: { token } }).then(({ data, error }) => {
      if (error || data?.error) { setError(data?.error || 'This link is not valid.'); return }
      setData(data); setSteps(data.steps || {})
    })
  }, [token])

  const done = data ? data.stepList.filter(s => steps[s.key]).length : 0
  const pct = data ? Math.round((done / data.stepList.length) * 100) : 0

  const save = async () => {
    setSaving(true)
    await supabase.functions.invoke('handoff-accept', { body: { token, steps } })
    setSaving(false); setSaved(true)
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        {error ? (
          <CardContent className="p-8 text-center text-muted-foreground">{error}</CardContent>
        ) : !data ? (
          <CardContent className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Hi {data.name}</CardTitle>
              <CardDescription>
                {data.ownerName} named you as a successor{data.role ? ` (${data.role})` : ''}. Please finish these steps by{' '}
                {new Date(data.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pct} className="h-2" />
              <div className="space-y-2">
                {data.stepList.map(s => (
                  <label key={s.key} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={!!steps[s.key]} onCheckedChange={v => { setSaved(false); setSteps(p => ({ ...p, [s.key]: !!v })) }} />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
              <Button className="w-full" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saved ? (pct === 100 ? 'All done, thank you' : 'Progress saved') : 'Save my progress'}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
