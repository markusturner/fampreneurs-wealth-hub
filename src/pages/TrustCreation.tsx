import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Lock, FileText, Building2, Church, Home, Loader2, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react"

type TrustType = 'business' | 'ministry' | 'family'

interface TrustAccess {
  has_access: boolean
  unlocked_trusts: string[]
  program: string | null
  is_pif: boolean
}

const TRUST_INFO: Record<TrustType, { label: string; icon: typeof Building2; description: string; formUrl: string }> = {
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
}

export default function TrustCreation() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get("type") as TrustType | null
  const { user } = useAuth()
  const { toast } = useToast()

  const [trustAccess, setTrustAccess] = useState<TrustAccess | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [selectedTrust, setSelectedTrust] = useState<TrustType | null>(initialType)
  const [submittedTrusts, setSubmittedTrusts] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAccess()
    fetchSubmissions()
  }, [])

  useEffect(() => {
    const typeParam = searchParams.get("type") as TrustType | null
    if (typeParam && ['business', 'ministry', 'family'].includes(typeParam)) {
      setSelectedTrust(typeParam)
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
      setSubmittedTrusts(new Set(data.map(d => d.trust_type)))
    }
  }

  const handleMarkSubmitted = async (type: TrustType) => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('trust_submissions')
        .insert({ user_id: user.id, trust_type: type } as any)
      if (error) throw error
      setSubmittedTrusts(prev => new Set([...prev, type]))
      toast({ title: 'Trust form submitted', description: 'Your submission has been recorded. You cannot resubmit this trust type.' })
    } catch (err: any) {
      if (err?.code === '23505') {
        toast({ title: 'Already submitted', description: 'You have already submitted this trust type.', variant: 'destructive' })
        setSubmittedTrusts(prev => new Set([...prev, type]))
      } else {
        console.error('Error recording submission:', err)
        toast({ title: 'Error', description: 'Failed to record submission.', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isUnlocked = (type: TrustType) => trustAccess?.unlocked_trusts?.includes(type) ?? false
  const isSubmitted = (type: TrustType) => submittedTrusts.has(type)

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-7 w-7 text-accent" />
          Trust Creation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a trust type and fill out the form to generate your trust document.
        </p>
        {trustAccess.is_pif && (
          <Badge className="mt-2 bg-accent text-accent-foreground">All Trusts Unlocked (Paid in Full)</Badge>
        )}
      </div>

      {/* Trust Type Selection or Embedded Form */}
      {!selectedTrust ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(TRUST_INFO) as [TrustType, typeof TRUST_INFO.business][]).map(([type, info]) => {
            const unlocked = isUnlocked(type)
            const submitted = isSubmitted(type)
            const Icon = info.icon
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all duration-200 ${
                  submitted
                    ? "border-accent/50 opacity-75"
                    : unlocked
                    ? "hover:border-accent hover:shadow-lg hover:shadow-accent/10"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => !submitted && unlocked && setSelectedTrust(type)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 relative">
                    <Icon className={`h-10 w-10 ${submitted ? "text-accent" : unlocked ? "text-accent" : "text-muted-foreground"}`} />
                    {!unlocked && !submitted && <Lock className="h-4 w-4 absolute -top-1 -right-1 text-destructive" />}
                    {submitted && <ShieldCheck className="h-4 w-4 absolute -top-1 -right-1 text-accent" />}
                  </div>
                  <CardTitle className="text-base">{info.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground text-center">{info.description}</p>
                  {submitted ? (
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
          })}
        </div>
      ) : isSubmitted(selectedTrust) ? (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedTrust(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Trust Selection
          </Button>
          <Card className="border-accent/30">
            <CardHeader className="text-center">
              <ShieldCheck className="h-12 w-12 mx-auto text-accent mb-4" />
              <CardTitle>Already Submitted</CardTitle>
              <CardDescription>
                You have already submitted your {TRUST_INFO[selectedTrust].label} form. Each trust type can only be submitted once.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setSelectedTrust(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Trust Selection
            </Button>
            <Button 
              onClick={() => handleMarkSubmitted(selectedTrust)}
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
                {(() => { const Icon = TRUST_INFO[selectedTrust].icon; return <Icon className="h-5 w-5 text-accent" /> })()}
                {TRUST_INFO[selectedTrust].label}
              </CardTitle>
              <CardDescription>{TRUST_INFO[selectedTrust].description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                src={TRUST_INFO[selectedTrust].formUrl}
                className="w-full border-0 rounded-b-lg"
                style={{ minHeight: "80vh" }}
                title={`${TRUST_INFO[selectedTrust].label} Form`}
                allowFullScreen
              >
                Loading…
              </iframe>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
