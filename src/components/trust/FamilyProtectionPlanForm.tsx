import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldCheck, ExternalLink, Sparkles, Download } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useAuth } from "@/contexts/AuthContext"


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
  const { user } = useAuth()
  const storageKey = user?.id ? `family_protection_plan_draft_${user.id}` : "family_protection_plan_draft_signed_out"
  const [restored, setRestored] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [planText, setPlanText] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    family_name: "",
    state: "",
    marital_status: "single",
    kids_count: "",
    top_worry: "",
    owns_home: "no",
    owns_business: "no",
    net_worth_range: "under_250k",
    top_goals: "",
    family_mission: "",
    assets: [] as string[],
    asset_purposes: "",
    foreign_assets: "no",
    foreign_assets_detail: "",
    has_heirs: "yes",
    heirs_alternative_notes: "",
    trustee_name: "",
    successor_trustee: "",
    trust_protector: "",
    knows_roles: "no",
    trusted_people: "",
    growth_assets: "unsure",
    growth_assets_detail: "",
    special_notes: "",

  })

  // Restore saved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.form) setForm(prev => ({ ...prev, ...parsed.form }))
        if (parsed?.planText) setPlanText(parsed.planText)
        if (parsed?.documentUrl) setDocumentUrl(parsed.documentUrl)
        if (parsed?.savedAt) setSavedAt(new Date(parsed.savedAt))
      }
    } catch (e) {
      console.error("Failed to restore draft", e)
    }
    setRestored(true)
  }, [storageKey])

  // Autosave draft
  useEffect(() => {
    if (!restored) return
    const timer = setTimeout(() => {
      try {
        const now = new Date()
        localStorage.setItem(storageKey, JSON.stringify({ form, planText, documentUrl, savedAt: now.toISOString() }))
        setSavedAt(now)
      } catch (e) {
        console.error("Failed to autosave draft", e)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [form, planText, documentUrl, restored, storageKey])

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
    if (!user?.id) {
      toast({ title: "Sign in required", description: "Please sign in before creating and saving your plan.", variant: "destructive" })
      return
    }
    if (!form.full_name || !form.family_name || !form.family_mission) {
      toast({ title: "Missing info", description: "Please fill in your name, family name, and mission.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("generate-family-protection-plan", {
        body: { form_data: form },
      })
      if (error) {
        const details = await error.context?.json?.().catch(() => null)
        throw new Error(details?.error || error.message || "Failed to generate plan.")
      }
      setPlanText(data.plan_text || null)
      setDocumentUrl(data.document_url || null)
      setSubmittedAt(new Date())
      toast({ title: "Plan created", description: "Your Family Protection Plan is ready." })
      onSubmitted?.()
    } catch (err: any) {
      console.error(err)
      toast({ title: "Error", description: err.message || "Failed to generate plan.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    if (!planText) return
    const { default: jsPDF } = await import("jspdf")
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 56
    let y = margin

    const newPageIfNeeded = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage()
        y = margin
      }
    }

    // Cover header
    doc.setFillColor(41, 10, 82)
    doc.rect(0, 0, pageW, 92, "F")
    doc.setTextColor(255, 181, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.text("Family Protection Plan", margin, 46)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`${form.family_name || "Your"} Family${form.state ? ` • ${form.state}` : ""}`, margin, 68)
    y = 128

    doc.setTextColor(90, 90, 90)
    doc.setFontSize(9)
    doc.text(`Prepared for ${form.full_name || "you"} • ${(submittedAt ?? new Date()).toLocaleDateString()}`, margin, y)
    y += 24

    const lines = planText.split("\n")
    for (const raw of lines) {
      const line = raw.trimEnd()
      if (!line.trim()) { y += 8; continue }

      const heading = line.match(/^(#{1,6})\s+(.*)$/)
      const bold = line.match(/^\*\*(.+)\*\*:?$/)
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)

      const clean = (t: string) => t.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "")

      if (heading || bold) {
        const text = clean(heading ? heading[2] : bold![1])
        newPageIfNeeded(34)
        y += 10
        doc.setTextColor(41, 10, 82)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(13)
        const wrapped = doc.splitTextToSize(text, pageW - margin * 2)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 16 + 4
        doc.setDrawColor(255, 181, 0)
        doc.setLineWidth(1.5)
        doc.line(margin, y - 2, margin + 46, y - 2)
        y += 10
        continue
      }

      doc.setTextColor(30, 30, 30)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10.5)

      if (bullet || numbered) {
        const marker = bullet ? "•" : `${numbered![1]}.`
        const text = clean(bullet ? bullet[1] : numbered![2])
        const wrapped = doc.splitTextToSize(text, pageW - margin * 2 - 18)
        newPageIfNeeded(wrapped.length * 14)
        doc.text(marker, margin, y)
        doc.text(wrapped, margin + 18, y)
        y += wrapped.length * 14 + 3
        continue
      }

      const wrapped = doc.splitTextToSize(clean(line), pageW - margin * 2)
      newPageIfNeeded(wrapped.length * 14)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 14 + 4
    }

    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(140, 140, 140)
      doc.text(`TruHeirs • Family Protection Plan • Page ${i} of ${pages}`, margin, pageH - 28)
    }

    doc.save(`${(form.family_name || "Family").replace(/\s+/g, "-")}-Protection-Plan.pdf`)
  }

  if (planText) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-emerald-600">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">Your Family Protection Plan is ready</span>
        </div>
        {submittedAt && (
          <p className="text-xs text-muted-foreground text-center">
            Submitted {submittedAt.toLocaleString()}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={downloadPdf} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          {documentUrl && (
            <Button asChild variant="outline" className="gap-2">
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                Open in Google Docs <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-sidebar px-5 py-4">
            <h3 className="text-lg font-semibold text-secondary">Family Protection Plan</h3>
            <p className="text-xs text-secondary/80">
              {(form.family_name || "Your")} Family{form.state ? ` • ${form.state}` : ""}
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed prose prose-sm max-w-none [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_p]:my-2">
            <ReactMarkdown>{planText}</ReactMarkdown>
          </div>
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={() => { setPlanText(null); setDocumentUrl(null); setSubmittedAt(null) }}>
            Start over
          </Button>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {savedAt && (
        <p className="text-xs text-muted-foreground text-right">
          Draft saved automatically at {savedAt.toLocaleTimeString()}
        </p>
      )}


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
      </div>

      <div className="space-y-2">
        <Label>6. What is your biggest worry about your family's future?</Label>
        <Textarea value={form.top_worry} onChange={e => update("top_worry", e.target.value)} placeholder="Losing what we built, taxes, lawsuits, kids not being ready..." rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>7. Do you own a home?</Label>
          <RadioGroup value={form.owns_home} onValueChange={v => update("owns_home", v)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="h-yes" /><Label htmlFor="h-yes">Yes</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="h-no" /><Label htmlFor="h-no">No</Label></div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>8. Do you own a business?</Label>
          <RadioGroup value={form.owns_business} onValueChange={v => update("owns_business", v)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="b-yes" /><Label htmlFor="b-yes">Yes</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="b-no" /><Label htmlFor="b-no">No</Label></div>
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-2">
        <Label>9. About how much is your family worth today?</Label>
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
        <Label>10. What are your top 3 goals for your family?</Label>
        <Textarea value={form.top_goals} onChange={e => update("top_goals", e.target.value)} placeholder="1. Keep our home safe...&#10;2. Pay for kids' college...&#10;3. Start a family business..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>11. Your family mission (one clear sentence)</Label>
        <Textarea value={form.family_mission} onChange={e => update("family_mission", e.target.value)} placeholder="We build wealth, faith, and freedom for every generation." rows={2} />
      </div>

      <div className="space-y-2">
        <Label>12. What do you want to protect? (check all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {ASSET_OPTIONS.map(a => (
            <div key={a} className="flex items-center gap-2">
              <Checkbox id={`a-${a}`} checked={form.assets.includes(a)} onCheckedChange={() => toggleAsset(a)} />
              <Label htmlFor={`a-${a}`} className="text-sm font-normal">{a}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>13. For each item you checked, what is its purpose? Will it stay the same or change over time?</Label>
        <p className="text-xs text-muted-foreground">
          This helps us pick the right trust for each asset. Example: your personal home usually never changes, so it fits well inside an irrevocable trust. A short-term rental or a property you may sell, refinance, or move soon may fit better in a revocable trust.
        </p>
        <Textarea value={form.asset_purposes} onChange={e => update("asset_purposes", e.target.value)} rows={4} placeholder="Home — we live here forever, never selling&#10;Airbnb condo — may sell in 2 years&#10;LLC — growing, may add partners" />
      </div>

      <div className="space-y-2">
        <Label>14. Do you own any assets outside of the United States?</Label>
        <RadioGroup value={form.foreign_assets} onValueChange={v => update("foreign_assets", v)} className="flex flex-wrap gap-4">
          {[["yes","Yes"],["no","No"],["unsure","Not sure"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`fa-${v}`} /><Label htmlFor={`fa-${v}`}>{l}</Label></div>
          ))}
        </RadioGroup>
        {form.foreign_assets !== "no" && (
          <Textarea value={form.foreign_assets_detail} onChange={e => update("foreign_assets_detail", e.target.value)} rows={2} placeholder="Land in Ghana, bank account in Mexico, condo in Portugal..." />
        )}
      </div>

      <div className="space-y-2">
        <Label>15. Do you have family or someone you plan to pass your wealth down to?</Label>
        <RadioGroup value={form.has_heirs} onValueChange={v => update("has_heirs", v)} className="flex flex-wrap gap-4">
          {[["yes","Yes"],["unsure","I am not sure"],["no","No, I do not have anyone"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`hh-${v}`} /><Label htmlFor={`hh-${v}`}>{l}</Label></div>
          ))}
        </RadioGroup>
        {form.has_heirs !== "yes" && (
          <Textarea value={form.heirs_alternative_notes} onChange={e => update("heirs_alternative_notes", e.target.value)} rows={2} placeholder="Causes, churches, charities, close friends, or missions you care about..." />
        )}
      </div>

      <div className="space-y-2">
        <Label>16. Do you already know who should hold each trust position (Trustee, Successor Trustee, Trust Protector)?</Label>
        <RadioGroup value={form.knows_roles} onValueChange={v => update("knows_roles", v)} className="flex flex-wrap gap-4">
          {[["yes","Yes, I know"],["some","I know some"],["no","No, please help me pick"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`kr-${v}`} /><Label htmlFor={`kr-${v}`}>{l}</Label></div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">There are no wrong answers. We will explain what each job does and why it matters in your plan.</p>
      </div>

      <div className="space-y-2">
        <Label>17. List the people you trust most. Be very descriptive. Add their full name, how they are related to you, and one strength (money smart, level-headed, organized, etc.)</Label>
        <Textarea value={form.trusted_people} onChange={e => update("trusted_people", e.target.value)} rows={3} placeholder="Maria Doe — sister — great with money&#10;John Smith — best friend — very fair and calm&#10;Pastor Ray — mentor — trusted, no money ties to us" />
      </div>


      {form.knows_roles !== "no" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your Trustee (leave blank if you want us to pick)</Label>
            <Input value={form.trustee_name} onChange={e => update("trustee_name", e.target.value)} placeholder="Full name or leave blank" />
          </div>
          <div className="space-y-2">
            <Label>Your Successor Trustee (leave blank if unsure)</Label>
            <Input value={form.successor_trustee} onChange={e => update("successor_trustee", e.target.value)} placeholder="Full name or leave blank" />
          </div>
          <div className="space-y-2">
            <Label>Your Trust Protector (leave blank if unsure)</Label>
            <Input value={form.trust_protector} onChange={e => update("trust_protector", e.target.value)} placeholder="Full name or leave blank" />
          </div>
        </div>
      )}


      <div className="space-y-2">
        <Label>18. Will the trust you are creating in the future hold anything that grows money (business, rentals, investments, cash-value life insurance)?</Label>
        <RadioGroup value={form.growth_assets} onValueChange={v => update("growth_assets", v)} className="flex flex-wrap gap-4">
          {[["yes","Yes, I plan to"],["some","Maybe a little"],["no","No"],["unsure","Not sure yet"]].map(([v,l]) => (
            <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`g-${v}`} /><Label htmlFor={`g-${v}`}>{l}</Label></div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>19. If yes, what would they be? If no, what could you add in the next 12 months?</Label>
        <Textarea value={form.growth_assets_detail} onChange={e => update("growth_assets_detail", e.target.value)} rows={2} placeholder="Rental duplex, my LLC, index funds, whole life policy..." />
      </div>

      <div className="space-y-2">
        <Label>20. Anything special we should know? (health, special needs, blended family, etc.)</Label>
        <Textarea value={form.special_notes} onChange={e => update("special_notes", e.target.value)} rows={2} />
      </div>


      <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <strong>Disclaimer:</strong> This plan is for education only. It is not legal, tax, or financial advice. No attorney-client relationship is created. Please review your plan with a licensed attorney and tax professional in your state before you act on it.
      </p>



      <Button onClick={handleGenerate} disabled={loading} variant="secondary" className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Building your plan..." : "Generate my Family Protection Plan"}
      </Button>
    </div>
  )
}
