import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Lock, FileText, Building2, Church, Home, Download, Loader2, CheckCircle2 } from "lucide-react"
import FamilyTrustForm from "@/components/trust/FamilyTrustForm"
import MinistryTrustForm from "@/components/trust/MinistryTrustForm"
import BusinessTrustForm from "@/components/trust/BusinessTrustForm"

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

export default function TrustCreation() {
  const [searchParams] = useSearchParams()
  const initialType = searchParams.get("type") as TrustType | null
  const { toast } = useToast()
  const { user } = useAuth()

  const [trustAccess, setTrustAccess] = useState<TrustAccess | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [selectedTrust, setSelectedTrust] = useState<TrustType | null>(initialType)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)

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

  const handleDownload = () => {
    if (!generatedDoc || !selectedTrust) return
    const blob = new Blob([generatedDoc], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedTrust}_trust_document.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerated = (doc: string) => {
    setGeneratedDoc(doc)
    toast({ title: "Trust Document Generated", description: "Your trust document has been created successfully." })
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
      ) : selectedTrust === 'family' ? (
        <FamilyTrustForm
          trustType="family"
          onBack={() => setSelectedTrust(null)}
          onGenerated={handleGenerated}
        />
      ) : selectedTrust === 'ministry' ? (
        <MinistryTrustForm
          onBack={() => setSelectedTrust(null)}
          onGenerated={handleGenerated}
        />
      ) : selectedTrust === 'business' ? (
        <BusinessTrustForm
          onBack={() => setSelectedTrust(null)}
          onGenerated={handleGenerated}
        />
      ) : null}
    </div>
  )
}
