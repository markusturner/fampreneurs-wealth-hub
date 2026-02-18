import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Lock, FileText, Building2, Church, Home, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import FamilyTrustForm from "@/components/trust/FamilyTrustForm"

type TrustType = 'business' | 'ministry' | 'family'

interface TrustAccess {
  has_access: boolean
  unlocked_trusts: string[]
  program: string | null
  is_pif: boolean
}

const TRUST_INFO: Record<TrustType, { label: string; icon: typeof Building2; description: string }> = {
  business: {
    label: "Business Trust",
    icon: Building2,
    description: "Private Unincorporated Business Trust for protecting business assets and operations.",
  },
  ministry: {
    label: "Ministry Trust",
    icon: Church,
    description: "Tax-Exempt Ministry Charitable Trust under Section 508(c)(1)(a) of the IRC.",
  },
  family: {
    label: "Family Trust",
    icon: Home,
    description: "Private Family Trust for protecting family assets and generational wealth transfer.",
  },
}

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
]

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

export default function TrustCreation() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get("type") as TrustType | null
  const { toast } = useToast()
  const { user } = useAuth()

  const [trustAccess, setTrustAccess] = useState<TrustAccess | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [selectedTrust, setSelectedTrust] = useState<TrustType | null>(initialType)
  const [generating, setGenerating] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)

  // Form fields
  const [formData, setFormData] = useState({
    trust_name: "",
    settlor_name: "",
    trustee_name: "",
    trust_protector_name: "",
    trust_street: "",
    trust_suite: "",
    trust_city: "",
    trust_state: "",
    trust_zip: "",
    beneficiary_name: "",
    date_day: "",
    date_month: "",
    date_year: new Date().getFullYear().toString(),
    state_jurisdiction: "",
    county: "",
    ein: "",
    ministry_purpose: "",
    compliance_steward_name: "",
    successor_trustees: "",
    successor_protectors: "",
    initial_assets: "",
    beneficiary_contacts: "",
  })

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-trust-access")
      if (error) throw error
      setTrustAccess(data)
    } catch (err) {
      console.error("Error checking trust access:", err)
      setTrustAccess({ has_access: false, unlocked_trusts: [], program: null, is_pif: false })
    } finally {
      setLoadingAccess(false)
    }
  }

  const isUnlocked = (type: TrustType) => trustAccess?.unlocked_trusts?.includes(type) ?? false

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    if (!selectedTrust) return

    // Validate required fields
    const required = ["trust_name", "settlor_name", "trustee_name", "trust_protector_name", "trust_street", "trust_city", "trust_state", "trust_zip", "beneficiary_name", "date_day", "date_month", "date_year"]
    const missing = required.filter(f => !formData[f as keyof typeof formData])
    if (missing.length > 0) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }

    setGenerating(true)
    setGeneratedDoc(null)

    try {
      const payload = {
        ...formData,
        successor_trustees: formData.successor_trustees ? formData.successor_trustees.split(",").map(s => s.trim()) : [],
        successor_protectors: formData.successor_protectors ? formData.successor_protectors.split(",").map(s => s.trim()) : [],
      }

      const { data, error } = await supabase.functions.invoke("generate-trust-document", {
        body: { trust_type: selectedTrust, form_data: payload },
      })

      if (error) throw error
      if (data.error) throw new Error(data.error)

      setGeneratedDoc(data.document)
      toast({ title: "Trust Document Generated", description: "Your trust document has been created successfully." })
    } catch (err: any) {
      console.error("Error generating trust:", err)
      toast({ title: "Generation Failed", description: err.message || "Something went wrong.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedDoc || !selectedTrust) return
    const blob = new Blob([generatedDoc], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${formData.trust_name || selectedTrust}_trust_document.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loadingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!trustAccess?.has_access) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <Card className="border-destructive/30">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Trust Creation Access Required</CardTitle>
            <CardDescription>
              Trust Creation is available exclusively for <strong>The Family Vault (TFV)</strong> and <strong>The Family Business Accelerator (TFBA)</strong> program members.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please upgrade to TFV or TFBA to unlock trust creation features.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-7 w-7 text-accent" />
          Trust Creation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a trust type, fill in your details, and generate your completed trust document.
        </p>
        {trustAccess.is_pif && (
          <Badge className="mt-2 bg-accent text-accent-foreground">All Trusts Unlocked (Paid in Full)</Badge>
        )}
      </div>

      {/* Trust Type Selection */}
      {!selectedTrust ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(TRUST_INFO) as [TrustType, typeof TRUST_INFO.business][]).map(([type, info]) => {
            const unlocked = isUnlocked(type)
            const Icon = info.icon
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all duration-200 ${
                  unlocked
                    ? "hover:border-accent hover:shadow-lg hover:shadow-accent/10"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => unlocked && setSelectedTrust(type)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 relative">
                    <Icon className={`h-10 w-10 ${unlocked ? "text-accent" : "text-muted-foreground"}`} />
                    {!unlocked && <Lock className="h-4 w-4 absolute -top-1 -right-1 text-destructive" />}
                  </div>
                  <CardTitle className="text-base">{info.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground text-center">{info.description}</p>
                  {unlocked ? (
                    <Badge variant="outline" className="w-full justify-center mt-3 border-accent/50 text-accent">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center mt-3 border-destructive/50 text-destructive">
                      <Lock className="h-3 w-3 mr-1" /> Locked
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (selectedTrust === 'family' || selectedTrust === 'ministry') && !generatedDoc ? (
        <FamilyTrustForm
          trustType={selectedTrust}
          onBack={() => setSelectedTrust(null)}
          onGenerated={(doc) => {
            setGeneratedDoc(doc)
            toast({ title: "Trust Document Generated", description: "Your trust document has been created successfully." })
          }}
        />
      ) : generatedDoc ? (
        /* Generated Document View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {TRUST_INFO[selectedTrust].label} — Generated Document
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setGeneratedDoc(null); setSelectedTrust(null) }}>
                Create Another
              </Button>
              <Button onClick={handleDownload} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[60vh]">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{generatedDoc}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Trust Form */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {(() => { const Icon = TRUST_INFO[selectedTrust].icon; return <Icon className="h-5 w-5 text-accent" /> })()}
              {TRUST_INFO[selectedTrust].label} Form
            </h2>
            <Button variant="ghost" onClick={() => setSelectedTrust(null)}>← Back</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trust Details</CardTitle>
              <CardDescription>Fill in the details for your trust document. Fields marked * are required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trust Name */}
              <div className="space-y-2">
                <Label>Trust Name *</Label>
                <Input placeholder={`e.g. The ${formData.settlor_name || "Smith"} ${selectedTrust === 'business' ? 'Business' : selectedTrust === 'ministry' ? 'Charitable' : 'Family'} Trust`}
                  value={formData.trust_name} onChange={e => handleChange("trust_name", e.target.value)} />
              </div>

              <Separator />

              {/* Key People */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Key People</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Settlor/Grantor Name *</Label>
                    <Input placeholder="First & Last Name" value={formData.settlor_name} onChange={e => handleChange("settlor_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trustee Name *</Label>
                    <Input placeholder="First & Last Name" value={formData.trustee_name} onChange={e => handleChange("trustee_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trust Protector Name *</Label>
                    <Input placeholder="First & Last Name" value={formData.trust_protector_name} onChange={e => handleChange("trust_protector_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Beneficiary Name *</Label>
                    <Input placeholder="e.g. The Smith Family Trust" value={formData.beneficiary_name} onChange={e => handleChange("beneficiary_name", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Successor Trustees</Label>
                    <Input placeholder="Comma-separated names" value={formData.successor_trustees} onChange={e => handleChange("successor_trustees", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Successor Trust Protectors</Label>
                    <Input placeholder="Comma-separated names" value={formData.successor_protectors} onChange={e => handleChange("successor_protectors", e.target.value)} />
                  </div>
                </div>

                {selectedTrust === "ministry" && (
                  <div className="space-y-2">
                    <Label>Compliance Steward Name</Label>
                    <Input placeholder="First & Last Name" value={formData.compliance_steward_name} onChange={e => handleChange("compliance_steward_name", e.target.value)} />
                  </div>
                )}
              </div>

              <Separator />

              {/* Trust Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trust Address</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Street Address *</Label>
                    <Input placeholder="123 Main Street" value={formData.trust_street} onChange={e => handleChange("trust_street", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Suite/Unit</Label>
                    <Input placeholder="Suite A" value={formData.trust_suite} onChange={e => handleChange("trust_suite", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input placeholder="City" value={formData.trust_city} onChange={e => handleChange("trust_city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={formData.trust_state} onValueChange={v => handleChange("trust_state", v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code *</Label>
                    <Input placeholder="00000" value={formData.trust_zip} onChange={e => handleChange("trust_zip", e.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date & Jurisdiction */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date & Jurisdiction</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Day *</Label>
                    <Input type="number" min="1" max="31" placeholder="22" value={formData.date_day} onChange={e => handleChange("date_day", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Month *</Label>
                    <Select value={formData.date_month} onValueChange={v => handleChange("date_month", v)}>
                      <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Input type="number" placeholder="2025" value={formData.date_year} onChange={e => handleChange("date_year", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>State of Jurisdiction</Label>
                    <Select value={formData.state_jurisdiction} onValueChange={v => handleChange("state_jurisdiction", v)}>
                      <SelectTrigger><SelectValue placeholder="Same as trust state" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>County</Label>
                    <Input placeholder="County name" value={formData.county} onChange={e => handleChange("county", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>EIN / Tax ID Number</Label>
                  <Input placeholder="XX-XXXXXXX" value={formData.ein} onChange={e => handleChange("ein", e.target.value)} />
                </div>
              </div>

              {selectedTrust === "ministry" && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ministry Details</h3>
                    <div className="space-y-2">
                      <Label>Ministry Purpose & Mission</Label>
                      <Textarea placeholder="Describe the religious, charitable, and educational purposes of this trust..." rows={4}
                        value={formData.ministry_purpose} onChange={e => handleChange("ministry_purpose", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Additional Information</h3>
                <div className="space-y-2">
                  <Label>Initial Assets (Schedule B)</Label>
                  <Textarea placeholder="List initial assets being transferred into the trust..." rows={3}
                    value={formData.initial_assets} onChange={e => handleChange("initial_assets", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Beneficiary Contact Information (Schedule C)</Label>
                  <Textarea placeholder="List beneficiaries with names and dates of birth..." rows={3}
                    value={formData.beneficiary_contacts} onChange={e => handleChange("beneficiary_contacts", e.target.value)} />
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
                    Generating Trust Document...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 mr-2" />
                    Generate Trust Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
