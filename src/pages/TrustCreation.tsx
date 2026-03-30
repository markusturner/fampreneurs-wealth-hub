import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Lock, FileText, Building2, Church, Home, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, ClipboardList, Package } from "lucide-react"
import { TrustDocumentsSection } from "@/components/trust/TrustDocumentsSection"
import { AssetInventoryForm } from "@/components/trust/AssetInventoryForm"
import { TrustChecklistForm } from "@/components/trust/TrustChecklistForm"

type SectionType = 'business' | 'ministry' | 'family' | 'asset_inventory' | 'trust_checklist'

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

const SECTION_INFO: Record<SectionType, { label: string; icon: typeof Building2; description: string; formUrl?: string }> = {
  family: {
    label: "Family Trust",
    icon: Home,
    description: "Private Family Trust for protecting family assets and generational wealth transfer.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScG21XrblvIjpA0sugRS3JzuBMXlqESE5ZLWcBJJpy5P6z-6w/viewform?embedded=true",
  },
  ministry: {
    label: "Ministry Trust",
    icon: Church,
    description: "Tax-Exempt Ministry Charitable Trust under Section 508(c)(1)(a) of the IRC.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBgkmTrnvnpfL4-h4MhBqbbgjCspz_nTFxB3-62C5lajv7og/viewform?embedded=true",
  },
  business: {
    label: "Business Trust",
    icon: Building2,
    description: "Private Unincorporated Business Trust for protecting business assets and operations.",
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSd_pqYjkF0_ij5PZ51rwEnebC2saONxDo-6XNuj599Lagoa2g/viewform?embedded=true",
  },
  asset_inventory: {
    label: "Asset Inventory List",
    icon: Package,
    description: "Organize your financial information for transferring assets into your trust.",
  },
  trust_checklist: {
    label: "Trust Checklist",
    icon: ClipboardList,
    description: "Checklist for establishing a trust — grantor, trustee, beneficiaries, and more.",
  },
}

const TRUST_TYPES: SectionType[] = ['family', 'ministry', 'business']
const TOOL_TYPES: SectionType[] = ['asset_inventory', 'trust_checklist']

// Submission limits: trust_name_translator = 3, everything else = 1
const getSubmissionLimit = (type: SectionType): number => {
  return 1 // All current sections auto-lock after 1 submission
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
    if (type === 'asset_inventory' || type === 'trust_checklist') return true
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
            ? "hover:border-accent hover:shadow-lg hover:shadow-accent/10"
            : "opacity-50 cursor-not-allowed"
        }`}
        onClick={() => !isDisabled && setSelectedSection(type)}
      >
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 relative">
            <Icon className={`h-10 w-10 ${locked ? "text-destructive" : submitted ? "text-accent" : unlocked ? "text-accent" : "text-muted-foreground"}`} />
            {locked && <Lock className="h-4 w-4 absolute -top-1 -right-1 text-destructive" />}
            {!locked && !unlocked && !submitted && <Lock className="h-4 w-4 absolute -top-1 -right-1 text-destructive" />}
            {submitted && !locked && <ShieldCheck className="h-4 w-4 absolute -top-1 -right-1 text-accent" />}
          </div>
          <CardTitle className="text-base">{info.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center">{info.description}</p>
          {locked ? (
            <Badge variant="outline" className="w-full justify-center mt-3 border-destructive/50 text-destructive">
              <Lock className="h-3 w-3 mr-1" /> {adminLockedExplicitly ? 'Admin Locked' : 'Auto-Locked'}
            </Badge>
          ) : submitted ? (
            <Badge variant="outline" className="w-full justify-center mt-3 border-accent/50 text-accent">
              <ShieldCheck className="h-3 w-3 mr-1" /> Submitted
            </Badge>
          ) : unlocked ? (
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
    if (selectedSection === 'asset_inventory' || selectedSection === 'trust_checklist') {
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
              ) : (
                <TrustChecklistForm onSubmitted={handleFormSubmitted} />
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-7 w-7 text-accent" />
          Trust Creation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a trust type or tool to get started.
        </p>
        {trustAccess.is_pif && (
          <Badge className="mt-2 bg-accent text-accent-foreground">All Trusts Unlocked (Paid in Full)</Badge>
        )}
      </div>

      {/* Trust Forms */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Trust Forms</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST_TYPES.map(type => renderSectionCard(type))}
        </div>
      </div>

      {/* Tools - Asset Inventory & Trust Checklist */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Trust Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOL_TYPES.map(type => renderSectionCard(type))}
        </div>
      </div>

      {/* Trust Documents Section */}
      <TrustDocumentsSection />
    </div>
  )
}
