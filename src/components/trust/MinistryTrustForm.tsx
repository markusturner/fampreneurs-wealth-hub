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
import { FileText, Loader2, Church } from "lucide-react"

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
]

interface MinistryTrustFormProps {
  onBack: () => void
  onGenerated: (doc: string) => void
}

export default function MinistryTrustForm({ onBack, onGenerated }: MinistryTrustFormProps) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    creation_date: "",
    creation_time: "",
    creation_ampm: "AM",
    charitable_trust_name: "",
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
    compliance_steward_name: "",
    charity_name: "",
    charity_owners: "",
    notarizing_date: "",
    notarizing_state: "",
    notarizing_county: "",
    tcu_dollar_amount: "",
    tcu_allocation: "",
    assets_list: "",
    family_trust_name_and_date: "",
    beneficiary_asset_assignment: "",
    first_successor_trustee: "",
    first_successor_compliance_steward: "",
    first_successor_protector: "",
    more_trustees: "No",
    more_compliance_stewards: "No",
    more_trust_protectors: "No",
  })

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    const required = [
      "full_name", "creation_date", "creation_time", "charitable_trust_name",
      "family_trust_name_beneficiary", "ein", "grantor_name", "trustee_name",
      "trust_protector_name", "trust_street", "trust_suite", "trust_city",
      "trust_state", "trust_zip", "max_board_trustees", "compliance_steward_name",
      "charity_name", "charity_owners", "notarizing_date", "notarizing_state",
      "notarizing_county", "tcu_dollar_amount", "tcu_allocation", "assets_list",
      "family_trust_name_and_date", "beneficiary_asset_assignment",
      "first_successor_trustee", "first_successor_compliance_steward"
    ]
    const missing = required.filter(f => !form[f as keyof typeof form])
    if (missing.length > 0) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }

    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke("generate-trust-document", {
        body: { trust_type: "ministry", form_data: form },
      })
      if (error) throw error
      if (data.error) throw new Error(data.error)
      onGenerated(data.document)
      toast({ title: "Trust Document Generated", description: "Your charitable trust document has been created successfully." })
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
          <Church className="h-5 w-5 text-accent" />
          Charitable Trust Form
        </h2>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charitable Trust Creation Form</CardTitle>
          <CardDescription>Fill in the details for your Private Charitable Trust. Fields marked * are required.</CardDescription>
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
                <Label>Charitable Trust Creation Date *</Label>
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
              <Label>Private Charitable Trust Name *</Label>
              <p className="text-xs text-muted-foreground">Please do not put your given name or put the word "trust" in your charitable trust's name.</p>
              <Input placeholder="e.g. The Grace Foundation" value={form.charitable_trust_name} onChange={e => handleChange("charitable_trust_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Private Family Trust Name (Beneficiary) *</Label>
              <p className="text-xs text-muted-foreground">Please do not put your given name or put the word "trust" in your family trust's name.</p>
              <Input placeholder="e.g. The Legacy Foundation" value={form.family_trust_name_beneficiary} onChange={e => handleChange("family_trust_name_beneficiary", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ministry Trust EIN Number *</Label>
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
              <div className="space-y-2">
                <Label>Compliance Steward's First and Last Name *</Label>
                <Input placeholder="First & Last Name" value={form.compliance_steward_name} onChange={e => handleChange("compliance_steward_name", e.target.value)} />
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

          {/* Board */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Board of Trustees</h3>
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

          <Separator />

          {/* Charity Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Charity Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name of Charity for Distribution *</Label>
                <Input placeholder="Charity name" value={form.charity_name} onChange={e => handleChange("charity_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Owner(s) of the Charity *</Label>
                <Input placeholder="First & Last Name(s)" value={form.charity_owners} onChange={e => handleChange("charity_owners", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notarization */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notarization</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Family Trust Notarizing Date *</Label>
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
              <Label>How are you allocating Trust Certificate Units to the Family Trust? *</Label>
              <p className="text-xs text-muted-foreground">e.g. 100 TCU to the J.D Family Legacy</p>
              <Textarea rows={3} placeholder="List TCU allocations..." value={form.tcu_allocation} onChange={e => handleChange("tcu_allocation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assets Passing Down to Beneficiaries (Family Trust) *</Label>
              <Textarea rows={4} placeholder="List all assets..." value={form.assets_list} onChange={e => handleChange("assets_list", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Family Trust Name and Date Created *</Label>
              <Input placeholder="Name and date" value={form.family_trust_name_and_date} onChange={e => handleChange("family_trust_name_and_date", e.target.value)} />
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
                <Label>First Compliance Steward Successor's Name *</Label>
                <Input placeholder="First & Last Name" value={form.first_successor_compliance_steward} onChange={e => handleChange("first_successor_compliance_steward", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>First Trust Protector Successor's Name</Label>
                <Input placeholder="First & Last Name" value={form.first_successor_protector} onChange={e => handleChange("first_successor_protector", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>More than 1 Trustee? *</Label>
                <RadioGroup value={form.more_trustees} onValueChange={v => handleChange("more_trustees", v)} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="mt-yes" />
                    <Label htmlFor="mt-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="mt-no" />
                    <Label htmlFor="mt-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>More than 1 Compliance Steward? *</Label>
                <RadioGroup value={form.more_compliance_stewards} onValueChange={v => handleChange("more_compliance_stewards", v)} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="mcs-yes" />
                    <Label htmlFor="mcs-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="mcs-no" />
                    <Label htmlFor="mcs-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>More than 1 Trust Protector? *</Label>
                <RadioGroup value={form.more_trust_protectors} onValueChange={v => handleChange("more_trust_protectors", v)} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="mtp-yes" />
                    <Label htmlFor="mtp-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="mtp-no" />
                    <Label htmlFor="mtp-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
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
                Generating Charitable Trust Document...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Generate Charitable Trust Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
