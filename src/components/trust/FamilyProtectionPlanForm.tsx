import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldCheck, ExternalLink, Sparkles } from "lucide-react"

interface Props {
  onSubmitted?: () => void
}

const ASSET_OPTIONS = [
  "Home",
  "Other real estate",
  "Business",
  "Savings & bank accounts",
  "Investments (stocks, crypto, etc.)",
  "Retirement accounts",
  "Life insurance",
  "Vehicles",
  "Intellectual property (trademark, copyright)",
  "Other valuables",
]

export function FamilyProtectionPlanForm({ onSubmitted }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [planText, setPlanText] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    family_name: "",
    state: "",
    marital_status: "single",
    kids_count: "",
    top_worry: "",
    exposure_level: "medium",
    owns_home: "no",
    owns_business: "no",
    net_worth_range: "under_250k",
    top_goals: "",
    family_mission: "",
    assets: [] as string[],
    trustee_name: "",
    successor_trustee: "",
    trust_protector: "",
    beneficiaries: "",
    special_notes: "",
  })

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const toggleAsset = (asset: string) => {
    setForm(prev => ({
      ...prev,
      assets: prev.assets.includes(asset)
        ? prev.assets.filter(a => a !== asset)
        : [...prev.assets, asset],
    }))
  }

  const handleGenerate = async () => {
    if (!form.full_name || !form.family_name || !form.family_mission) {
      toast({ title: "Missing info", description: "Please fill in your name, family name, and mission.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("generate-family-protection-plan", {
        body: { form_data: form },
      })
      if (error) throw error
      setPlanText(data.plan_text || null)
      setDocumentUrl(data.document_url || null)
      toast({ title: "Plan created", description: "Your Family Protection Plan is ready." })
      onSubmitted?.()
    } catch (err: any) {
      console.error(err)
      toast({ title: "Error", description: err.message || "Failed to generate plan.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (planText) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">Your Family Protection Plan is ready</span>
        </div>
        {documentUrl && (
          <Button asChild className="gap-2">
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Docs <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <div className="rounded-lg border bg-muted/30 p-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm">
          {planText}
        </div>
        <Button variant="outline" onClick={() => { setPlanText(null); setDocumentUrl(null) }}>
          Start over
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground">
        Answer these short questions. We will build a custom Family Protection Plan for you in seconds.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>1. Your full name</Label>
          <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label>2. Your family (last) name</Label>
          <Input value={form.family_name} onChange={e => update("family_name", e.target.value)} placeholder="Doe" />
        </div>
        <div className="space-y-2">
          <Label>3. What state do you live in?</Label>
          <Input value={form.state} onChange={e => update("state", e.target.value)} placeholder="California" />
        </div>
        <div className="space-y-2">
          <Label>4. Marital status</Label>
          <RadioGroup value={form.marital_status} onValueChange={v => update("marital_status", v)} className="flex flex-wrap gap-4">
            {["single","married","divorced","widowed"].map(o => (
              <div key={o} className="flex items-center gap-2"><RadioGroupItem value={o} id={`m-${o}`} /><Label htmlFor={`m-${o}`} className="capitalize">{o}</Label></div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>5. How many kids do you have?</Label>
          <Input type="number" min="0" value={form.kids_count} onChange={e => update("kids_count", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>6. How risky is your situation right now?</Label>
          <RadioGroup value={form.exposure_level} onValueChange={v => update("exposure_level", v)} className="flex gap-4">
            {["low","medium","high"].map(o => (
              <div key={o} className="flex items-center gap-2"><RadioGroupItem value={o} id={`e-${o}`} /><Label htmlFor={`e-${o}`} className="capitalize">{o}</Label></div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-2">
        <Label>7. What is your biggest worry about your family's future?</Label>
        <Textarea value={form.top_worry} onChange={e => update("top_worry", e.target.value)} placeholder="Losing what we built, taxes, lawsuits, kids not being ready..." rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>8. Do you own a home?</Label>
          <RadioGroup value={form.owns_home} onValueChange={v => update("owns_home", v)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="h-yes" /><Label htmlFor="h-yes">Yes</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="h-no" /><Label htmlFor="h-no">No</Label></div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>9. Do you own a business?</Label>
          <RadioGroup value={form.owns_business} onValueChange={v => update("owns_business", v)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="b-yes" /><Label htmlFor="b-yes">Yes</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="b-no" /><Label htmlFor="b-no">No</Label></div>
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-2">
        <Label>10. About how much is your family worth today?</Label>
        <RadioGroup value={form.net_worth_range} onValueChange={v => update("net_worth_range", v)} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ["under_250k","Under $250k"],
            ["250k_1m","$250k – $1M"],
            ["1m_5m","$1M – $5M"],
            ["5m_25m","$5M – $25M"],
            ["25m_plus","$25M+"],
          ].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`n-${v}`} /><Label htmlFor={`n-${v}`}>{l}</Label></div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>11. What are your top 3 goals for your family?</Label>
        <Textarea value={form.top_goals} onChange={e => update("top_goals", e.target.value)} placeholder="1. Keep our home safe...&#10;2. Pay for kids' college...&#10;3. Start a family business..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>12. Your family mission (one clear sentence)</Label>
        <Textarea value={form.family_mission} onChange={e => update("family_mission", e.target.value)} placeholder="We build wealth, faith, and freedom for every generation." rows={2} />
      </div>

      <div className="space-y-2">
        <Label>13. What do you want to protect? (check all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {ASSET_OPTIONS.map(a => (
            <div key={a} className="flex items-center gap-2">
              <Checkbox id={`a-${a}`} checked={form.assets.includes(a)} onCheckedChange={() => toggleAsset(a)} />
              <Label htmlFor={`a-${a}`} className="text-sm font-normal">{a}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>14. Who will be your Trustee?</Label>
          <Input value={form.trustee_name} onChange={e => update("trustee_name", e.target.value)} placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <Label>15. Who will be your Successor Trustee?</Label>
          <Input value={form.successor_trustee} onChange={e => update("successor_trustee", e.target.value)} placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <Label>16. Who will be your Trust Protector?</Label>
          <Input value={form.trust_protector} onChange={e => update("trust_protector", e.target.value)} placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <Label>17. Who are your beneficiaries?</Label>
          <Input value={form.beneficiaries} onChange={e => update("beneficiaries", e.target.value)} placeholder="Names, separated by commas" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>18. Anything special we should know? (health, special needs, blended family, etc.)</Label>
        <Textarea value={form.special_notes} onChange={e => update("special_notes", e.target.value)} rows={2} />
      </div>

      <Button onClick={handleGenerate} disabled={loading} variant="secondary" className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Building your plan..." : "Generate my Family Protection Plan"}
      </Button>
    </div>
  )
}
