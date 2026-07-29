import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Lock, FileText, Building2, Church, Home, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, ClipboardList, Package, Users, AlertTriangle, ExternalLink, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrustAssetUploads } from "@/components/trust/TrustAssetUploads"
import { AssetInventoryForm } from "@/components/trust/AssetInventoryForm"
import { TrustChecklistForm } from "@/components/trust/TrustChecklistForm"
import { TrustNameTranslator } from "@/components/trust/TrustNameTranslator"
import { FamilyProtectionPlanForm } from "@/components/trust/FamilyProtectionPlanForm"

type SectionType = 'business' | 'ministry' | 'family' | 'asset_inventory' | 'trust_name_translator' | 'trust_asset_uploads' | 'family_protection_plan'

interface TrustAccess {
  has_access: boolean
  unlocked_trusts: string[]
  program: string | null
  is_pif: boolean
}

interface PageLock {
  page_name: string
  is_locked: boolean
}

const SECTION_INFO: Record<SectionType, { label: string; icon: typeof Building2; description: string; formUrl?: string; prepDocUrl?: string }> = {
  family_protection_plan: {
    label: "Family Protection Plan",
    icon: Shield,
    description: "Answer a few short questions and we'll build a custom Family Protection Plan document tailored to your family.",
  },
  family: {
    label: "Family Trust",
    icon: Home,
    description: "Private Family Trust for protecting family assets and generational wealth transfer.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScG21XrblvIjpA0sugRS3JzuBMXlqESE5ZLWcBJJpy5P6z-6w/viewform?embedded=true",
    prepDocUrl: "https://docs.google.com/document/d/1X58jQC12S6XRmWBen_wxSf2_Uup2zo4LbBzS9fKfBFY/edit?usp=sharing",
  },
  ministry: {
    label: "Ministry Trust",
    icon: Church,
    description: "Tax-Exempt Ministry Charitable Trust under Section 508(c)(1)(a) of the IRC.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBgkmTrnvnpfL4-h4MhBqbbgjCspz_nTFxB3-62C5lajv7og/viewform?embedded=true",
    prepDocUrl: "https://docs.google.com/document/d/13h393BbHmkxEueYWHvVQk3AmVPV6L-KtL9uwjYJB9as/edit?usp=sharing",
  },
  business: {
    label: "Business Trust",
    icon: Building2,
    description: "Private Unincorporated Business Trust for protecting business assets and operations.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSd_pqYjkF0_ij5PZ51rwEnebC2saONxDo-6XNuj599Lagoa2g/viewform?embedded=true",
    prepDocUrl: "https://docs.google.com/document/d/1hfXA3fDJC0gfcNRHlQhgSYQexkdHxaCRNWvEu0BlEss/edit?usp=sharing",
  },
  asset_inventory: {
    label: "Asset Inventory List",
    icon: Package,
    description: "Organize your financial information for transferring assets into your trust.",
  },
  trust_name_translator: {
    label: "Trust Name Translator",
    icon: FileText,
    description: "Translate your trust name into multiple languages including Latin, Hebrew, Greek, and more.",
  },
  trust_asset_uploads: {
    label: "Schedule B & Proof of Transfer",
    icon: ClipboardList,
    description: "Upload your Schedule B asset lists and proof of transfer documents for your trust.",
  },
}

const TRUST_TYPES: SectionType[] = ['family', 'ministry', 'business']
const TOOL_TYPES: SectionType[] = ['trust_name_translator', 'asset_inventory', 'trust_asset_uploads']

// Submission limits: trust_name_translator = 3, everything else = 1
const getSubmissionLimit = (type: SectionType): number => {
  if (type === 'trust_name_translator') return 3
  return 1
}

export default function TrustCreation() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get("type") as SectionType | null
  const { user } = useAuth()
  const { toast } = useToast()

  const [trustAccess, setTrustAccess] = useState<TrustAccess | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(initialType)
  const [submittedTrusts, setSubmittedTrusts] = useState<Set<string>>(new Set())
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [adminLocks, setAdminLocks] = useState<PageLock[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAccess()
    fetchSubmissions()
    fetchAdminLocks()
  }, [])

  useEffect(() => {
    const typeParam = searchParams.get("type") as SectionType | null
    if (typeParam && Object.keys(SECTION_INFO).includes(typeParam)) {
      setSelectedSection(typeParam)
    }
  }, [searchParams])

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

  const fetchSubmissions = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('trust_submissions')
      .select('trust_type')
      .eq('user_id', user.id)
    if (data) {
      const types = data.map(d => d.trust_type)
      setSubmittedTrusts(new Set(types))
      // Count submissions per type
      const counts: Record<string, number> = {}
      types.forEach(t => { counts[t] = (counts[t] || 0) + 1 })
      setSubmissionCounts(counts)
    }
  }

  const fetchAdminLocks = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('trust_page_locks' as any)
      .select('page_name, is_locked')
      .eq('user_id', user.id)
    if (data) {
      setAdminLocks((data as any[]).map((d: any) => ({ page_name: d.page_name, is_locked: d.is_locked })))
    }
  }

  const handleMarkSubmitted = async (type: SectionType) => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('trust_submissions')
        .insert({ user_id: user.id, trust_type: type } as any)
      if (error) throw error
      setSubmittedTrusts(prev => new Set([...prev, type]))
      setSubmissionCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
      toast({ title: 'Form submitted', description: 'Your submission has been recorded. This page is now locked.' })
    } catch (err: any) {
      if (err?.code === '23505') {
        toast({ title: 'Already submitted', description: 'You have already submitted this form.', variant: 'destructive' })
        setSubmittedTrusts(prev => new Set([...prev, type]))
      } else {
        console.error('Error recording submission:', err)
        toast({ title: 'Error', description: 'Failed to record submission.', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isAdminLocked = (type: SectionType): boolean => {
    const lock = adminLocks.find(l => l.page_name === type)
    return lock?.is_locked === true
  }

  const isAutoLocked = (type: SectionType): boolean => {
    const count = submissionCounts[type] || 0
    const limit = getSubmissionLimit(type)
    return count >= limit
  }

  const isSectionLocked = (type: SectionType): boolean => {
    // Admin lock takes priority (admin can lock OR unlock)
    const adminLock = adminLocks.find(l => l.page_name === type)
    if (adminLock) {
      return adminLock.is_locked
    }
    // Otherwise check auto-lock
    return isAutoLocked(type)
  }

  const isUnlocked = (type: SectionType) => {
    if (type === 'asset_inventory' || type === 'trust_name_translator' || type === 'trust_asset_uploads' || type === 'family_protection_plan') return true
    return trustAccess?.unlocked_trusts?.includes(type) ?? false
  }

  const isSubmitted = (type: SectionType) => submittedTrusts.has(type)

  const handleFormSubmitted = () => {
    fetchSubmissions()
    setSelectedSection(null)
  }

  const renderSectionCard = (type: SectionType) => {
    const info = SECTION_INFO[type]
    const unlocked = isUnlocked(type)
    const locked = isSectionLocked(type)
    const submitted = isSubmitted(type)
    const adminLockedExplicitly = isAdminLocked(type)
    const Icon = info.icon

    const isDisabled = locked || (!unlocked && !submitted)

    return (
      <Card
        key={type}
        className={`cursor-pointer transition-all duration-200 ${
          locked
            ? "border-destructive/30 opacity-60 cursor-not-allowed"
            : submitted && !locked
            ? "border-accent/50 opacity-75"
            : unlocked
            ? "hover:border-accent hover:shadow-md hover:shadow-accent/10"
            : "opacity-50 cursor-not-allowed"
        }`}
        onClick={() => !isDisabled && setSelectedSection(type)}
      >
        <CardHeader className="text-center p-2 pb-1">
          <div className="mx-auto mb-1 relative">
            <Icon className={`h-6 w-6 ${locked ? "text-destructive" : submitted ? "text-accent" : unlocked ? "text-accent" : "text-muted-foreground"}`} />
            {locked && <Lock className="h-3 w-3 absolute -top-1 -right-1 text-destructive" />}
            {!locked && !unlocked && !submitted && <Lock className="h-3 w-3 absolute -top-1 -right-1 text-destructive" />}
            {submitted && !locked && <ShieldCheck className="h-3 w-3 absolute -top-1 -right-1 text-accent" />}
          </div>
          <CardTitle className="text-xs leading-tight">{info.label}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {locked ? (
            <Badge variant="outline" className="w-full justify-center border-destructive/50 text-destructive text-[10px] px-1 py-0">
              <Lock className="h-2.5 w-2.5 mr-1" /> {adminLockedExplicitly ? 'Admin Locked' : 'Locked'}
            </Badge>
          ) : submitted ? (
            <Badge variant="outline" className="w-full justify-center border-accent/50 text-accent text-[10px] px-1 py-0">
              <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Submitted
            </Badge>
          ) : unlocked ? (
            <Badge variant="outline" className="w-full justify-center border-accent/50 text-accent text-[10px] px-1 py-0">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Unlocked
            </Badge>
          ) : (
            <Badge variant="outline" className="w-full justify-center border-destructive/50 text-destructive text-[10px] px-1 py-0">
              <Lock className="h-2.5 w-2.5 mr-1" /> Locked
            </Badge>
          )}
        </CardContent>
      </Card>
    )
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

  // Selected section view
  if (selectedSection) {
    const info = SECTION_INFO[selectedSection]
    const locked = isSectionLocked(selectedSection)

    if (locked) {
      return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedSection(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trust Selection
          </Button>
          <Card className="border-destructive/30">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto text-destructive mb-4" />
              <CardTitle>Page Locked</CardTitle>
              <CardDescription>
                This {info.label} page has been locked. {isAdminLocked(selectedSection) ? 'An administrator has locked this page.' : 'You have already submitted this form and it has been auto-locked.'}
                {' '}Contact an administrator if you need to make changes.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    }

    // Asset Inventory & Trust Checklist use React forms
    if (selectedSection === 'asset_inventory' || selectedSection === 'trust_name_translator' || selectedSection === 'trust_asset_uploads') {
      return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => setSelectedSection(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trust Selection
          </Button>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {(() => { const Icon = info.icon; return <Icon className="h-5 w-5 text-accent" /> })()}
                {info.label}
              </CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSection === 'asset_inventory' ? (
                <AssetInventoryForm onSubmitted={handleFormSubmitted} />
              ) : selectedSection === 'trust_asset_uploads' ? (
                <TrustAssetUploads onSubmitted={handleFormSubmitted} />
              ) : (
                <TrustNameTranslator onSubmitted={handleFormSubmitted} />
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    // Trust types use embedded Google Forms
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedSection(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trust Selection
          </Button>
          <Button
            onClick={() => handleMarkSubmitted(selectedSection)}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark as Submitted
          </Button>
        </div>
        <Alert className="border-[#ffb500]/40 bg-[#ffb500]/10">
          <AlertTriangle className="h-4 w-4 text-[#ffb500]" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> This page will auto-lock after you submit. Once submitted, you will not be able to make changes — so please make sure all your information is accurate before submitting.
            {info.prepDocUrl && (
              <span className="block mt-2">
                Want to prepare first?{' '}
                <a
                  href={info.prepDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#ffb500] hover:text-[#2eb2ff] underline underline-offset-2 transition-colors"
                >
                  Download the questions doc to review before submitting
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {(() => { const Icon = info.icon; return <Icon className="h-5 w-5 text-accent" /> })()}
              {info.label}
            </CardTitle>
            <CardDescription>{info.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={info.formUrl}
              className="w-full border-0 rounded-b-lg"
              style={{ minHeight: "80vh" }}
              title={`${info.label} Form`}
              allowFullScreen
            >
              Loading…
            </iframe>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main selection view
  return (
    <div className="p-3 sm:p-4 space-y-3 max-w-6xl mx-auto h-[calc(100dvh-4rem)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Trust Creation
            {trustAccess.is_pif && (
              <Badge className="ml-2 bg-accent text-accent-foreground text-[10px] px-1.5 py-0">PIF — All Unlocked</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-xs">Select a trust type or tool to get started.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.location.assign('/classroom')} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-4 w-4" /> Back to Classroom
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-around gap-3 min-h-0">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">Step 1</Badge>
            <h2 className="text-sm font-semibold text-foreground">Trust Name & Asset Inventory</h2>
          </div>
          <div className="grid gap-2 grid-cols-2">
            {(['trust_name_translator', 'asset_inventory'] as SectionType[]).map(type => renderSectionCard(type))}
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">Step 2</Badge>
            <h2 className="text-sm font-semibold text-foreground">Trust Forms</h2>
          </div>
          <div className="grid gap-2 grid-cols-3">
            {TRUST_TYPES.map(type => renderSectionCard(type))}
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">Step 3</Badge>
            <h2 className="text-sm font-semibold text-foreground">Schedule B, Proof of Transfer & Complimentary Calls</h2>
          </div>
          <div className="grid gap-2 grid-cols-3">
            {(['trust_asset_uploads'] as SectionType[]).map(type => renderSectionCard(type))}
            {[
              {
                title: "Call w/ Attorney Domonique Price",
                url: "https://calendly.com/dprice-2/estateplanning-withprice?month=2023-08",
              },
              {
                title: "Call w/ Hasani Houston",
                url: "https://calendly.com/hzhouston12/wealth-consultation-famp",
              },
            ].map((item) => (
              <Card
                key={item.url}
                onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                className="cursor-pointer transition-all hover:shadow-md hover:border-accent"
              >
                <CardHeader className="text-center p-2 pb-1">
                  <div className="mx-auto mb-1">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xs leading-tight flex items-center justify-center gap-1">
                    {item.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <Badge variant="outline" className="w-full justify-center border-accent/50 text-accent text-[10px] px-1 py-0">
                    Complimentary
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
