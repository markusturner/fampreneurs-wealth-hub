import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { FileText, Loader2, Building2 } from "lucide-react"

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
]

interface BusinessTrustFormProps {
  onBack: () => void
  onGenerated: (doc: string) => void
}

export default function BusinessTrustForm({ onBack, onGenerated }: BusinessTrustFormProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    creation_date: "",
    creation_time: "",
    creation_ampm: "AM",
    business_trust_name: "",
    family_trust_name_beneficiary: "",
    ein: "",
    grantor_name: "",
    trustee_name: "",
    trust_protector_name: "",
    trust_street: "",
    trust_suite: "",
    trust_city: "",
    trust_state: "",
    trust_zip: "",
    max_board_trustees: "",
    descendants: "",
    notarizing_date: "",
    notarizing_state: "",
    notarizing_county: "",
    tcu_dollar_amount: "",
    tcu_allocation: "",
    assets_list: "",
    business_trust_name_and_date: "",
    beneficiary_asset_assignment: "",
    first_successor_trustee: "",
    first_successor_protector: "",
    more_trustees: "No",
    additional_trustees: "",
    more_trust_protectors: "No",
    additional_trust_protectors: "",
  })

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    const required = [
      "full_name", "creation_date", "creation_time", "business_trust_name",
      "family_trust_name_beneficiary", "ein", "grantor_name", "trustee_name",
      "trust_protector_name", "trust_street", "trust_suite", "trust_city",
      "trust_state", "trust_zip", "max_board_trustees", "descendants",
      "notarizing_date", "notarizing_state", "notarizing_county",
      "tcu_dollar_amount", "tcu_allocation", "assets_list",
      "business_trust_name_and_date", "beneficiary_asset_assignment",
      "first_successor_trustee"
    ]
    const missing = required.filter(f => !form[f as keyof typeof form])
    if (missing.length > 0) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }

    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke("generate-trust-document", {
        body: { trust_type: "business", form_data: form },
      })
      if (error) throw error
      if (data.error) throw new Error(data.error)
      onGenerated(data.document)
      toast({ title: "Trust Document Generated", description: "Your business trust document has been created successfully." })
    } catch (err: any) {
      console.error("Error generating trust:", err)
      toast({ title: "Generation Failed", description: err.message || "Something went wrong.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-accent" />
          Business Trust Form
        </h2>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Trust Creation Form</CardTitle>
          <CardDescription>Fill in the details for your Private Business Trust. Fields marked * are required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="Your email" value={form.email} onChange={e => handleChange("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>First and Last Name *</Label>
                <Input placeholder="First & Last Name" value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Creation Date & Time */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trust Creation Date & Time</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Business Trust Creation Date *</Label>
                <Input type="date" value={form.creation_date} onChange={e => handleChange("creation_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time Created *</Label>
                <Input type="time" value={form.creation_time} onChange={e => handleChange("creation_time", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Trust Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trust Identity</h3>
            <div className="space-y-2">
              <Label>Private Business Trust Name *</Label>
              <p className="text-xs text-muted-foreground">Please do not put your given name or put the word "trust" in your business trust's name.</p>
              <Input placeholder="e.g. The Prosperity Group" value={form.business_trust_name} onChange={e => handleChange("business_trust_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Private Family Trust Name (Beneficiary) *</Label>
              <p className="text-xs text-muted-foreground">Please do not put your given name or put the word "trust" in your family trust's name.</p>
              <Input placeholder="e.g. The Legacy Foundation" value={form.family_trust_name_beneficiary} onChange={e => handleChange("family_trust_name_beneficiary", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Business Trust EIN Number *</Label>
              <Input placeholder="XX-XXXXXXX" value={form.ein} onChange={e => handleChange("ein", e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Key People */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Key People</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Grantor's First and Last Name *</Label>
                <p className="text-xs text-muted-foreground">It can either be a natural person or an entity.</p>
                <Input placeholder="First & Last Name" value={form.grantor_name} onChange={e => handleChange("grantor_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trustee's First and Last Name *</Label>
                <Input placeholder="First & Last Name" value={form.trustee_name} onChange={e => handleChange("trustee_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trust Protector's First and Last Name *</Label>
                <Input placeholder="First & Last Name" value={form.trust_protector_name} onChange={e => handleChange("trust_protector_name", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Trust Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trust Address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Street Address *</Label>
                <p className="text-xs text-muted-foreground">Exclude suite #, city, state and zip code.</p>
                <Input placeholder="123 Main Street" value={form.trust_street} onChange={e => handleChange("trust_street", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Suite Number *</Label>
                <Input placeholder="Suite A" value={form.trust_suite} onChange={e => handleChange("trust_suite", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Input placeholder="City" value={form.trust_city} onChange={e => handleChange("trust_city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={form.trust_state} onValueChange={v => handleChange("trust_state", v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ZIP Code *</Label>
                <Input placeholder="00000" value={form.trust_zip} onChange={e => handleChange("trust_zip", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Board & Descendants */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Board & Descendants</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Max Board of Trustees *</Label>
                <Select value={form.max_board_trustees} onValueChange={v => handleChange("max_board_trustees", v)}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Two (2)</SelectItem>
                    <SelectItem value="3">Three (3) - Recommended</SelectItem>
                    <SelectItem value="4">Four (4)</SelectItem>
                    <SelectItem value="5">Five (5)</SelectItem>
                    <SelectItem value="6">Six (6)</SelectItem>
                    <SelectItem value="7">Seven (7)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descendants of the Trust (First and Last Name) *</Label>
              <Textarea rows={3} placeholder="List all descendants..." value={form.descendants} onChange={e => handleChange("descendants", e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Notarization */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notarization</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Business Trust Notarizing Date *</Label>
                <Input type="date" value={form.notarizing_date} onChange={e => handleChange("notarizing_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notarizing State *</Label>
                <Select value={form.notarizing_state} onValueChange={v => handleChange("notarizing_state", v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notarizing County *</Label>
                <Input placeholder="County name" value={form.notarizing_county} onChange={e => handleChange("notarizing_county", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Trust Certificate Units & Assets */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trust Certificate Units & Assets</h3>
            <div className="space-y-2">
              <Label>Dollar Amount Exchanged for Trust Certificate Units (USD) *</Label>
              <Input placeholder="e.g. $1.00" value={form.tcu_dollar_amount} onChange={e => handleChange("tcu_dollar_amount", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>How are you allocating Trust Certificate Units to the Business Trust? *</Label>
              <p className="text-xs text-muted-foreground">e.g. 100 TCU to the J.D Family Legacy</p>
              <Textarea rows={3} placeholder="List TCU allocations..." value={form.tcu_allocation} onChange={e => handleChange("tcu_allocation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assets Passing Down to Beneficiaries (Business Trust) *</Label>
              <Textarea rows={4} placeholder="List all assets..." value={form.assets_list} onChange={e => handleChange("assets_list", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Business Trust Name and Date Created *</Label>
              <Input placeholder="Name and date" value={form.business_trust_name_and_date} onChange={e => handleChange("business_trust_name_and_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Which Beneficiary Gets Which Asset? *</Label>
              <p className="text-xs text-muted-foreground">e.g. 1234 Main Street, Atlanta, GA 30331 - J.D. Family Legacy</p>
              <Textarea rows={4} placeholder="List asset assignments..." value={form.beneficiary_asset_assignment} onChange={e => handleChange("beneficiary_asset_assignment", e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Successors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Successors</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Trustee Successor's Name *</Label>
                <Input placeholder="First & Last Name" value={form.first_successor_trustee} onChange={e => handleChange("first_successor_trustee", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>First Trust Protector Successor's Name</Label>
                <Input placeholder="First & Last Name" value={form.first_successor_protector} onChange={e => handleChange("first_successor_protector", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>More than 1 Trustee? *</Label>
                <RadioGroup value={form.more_trustees} onValueChange={v => handleChange("more_trustees", v)} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="bt-yes" />
                    <Label htmlFor="bt-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="bt-no" />
                    <Label htmlFor="bt-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
                {form.more_trustees === "Yes" && (
                  <Textarea rows={3} placeholder="List additional trustees (First & Last Name, one per line)" value={form.additional_trustees} onChange={e => handleChange("additional_trustees", e.target.value)} />
                )}
              </div>
              <div className="space-y-2">
                <Label>More than 1 Trust Protector? *</Label>
                <RadioGroup value={form.more_trust_protectors} onValueChange={v => handleChange("more_trust_protectors", v)} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="btp-yes" />
                    <Label htmlFor="btp-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="btp-no" />
                    <Label htmlFor="btp-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
                {form.more_trust_protectors === "Yes" && (
                  <Textarea rows={3} placeholder="List additional trust protectors (First & Last Name, one per line)" value={form.additional_trust_protectors} onChange={e => handleChange("additional_trust_protectors", e.target.value)} />
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Business Trust Document...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Generate Business Trust Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
