import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

const CHECKLIST_ITEMS = [
  "Business/Private Family Trust Name",
  "Designated Registered Agent for the Trust",
  "Create a Business Trust's Mission Statement or Purpose",
  "Identifying the Grantor",
  "Selection of Trustee",
  "Identification of Beneficiaries",
  "Prospective Board Members",
  "Choosing Assets to Transfer to the Trust",
]

export function TrustChecklistForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(item => [item, false]))
  )
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(item => [item, ""]))
  )

  // Grantor info
  const [grantorName, setGrantorName] = useState("")
  const [trusteeName, setTrusteeName] = useState("")
  const [successorTrustee, setSuccessorTrustee] = useState("")
  const [beneficiariesDuringLife, setBeneficiariesDuringLife] = useState("")
  const [beneficiariesAfterPassing, setBeneficiariesAfterPassing] = useState("")
  const [managementInstructions, setManagementInstructions] = useState("")
  const [trustName, setTrustName] = useState("")
  const [registeredAgent, setRegisteredAgent] = useState("")
  const [missionStatement, setMissionStatement] = useState("")
  const [boardMembers, setBoardMembers] = useState("")
  const [assetsToTransfer, setAssetsToTransfer] = useState("")

  const handleSubmit = async () => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      const formData = {
        checkedItems,
        notes,
        trustName,
        registeredAgent,
        missionStatement,
        grantorName,
        trusteeName,
        successorTrustee,
        beneficiariesDuringLife,
        beneficiariesAfterPassing,
        managementInstructions,
        boardMembers,
        assetsToTransfer,
      }
      const { error } = await supabase
        .from("trust_submissions")
        .insert({ user_id: user.id, trust_type: "trust_checklist", form_data: formData } as any)
      if (error) throw error
      toast({ title: "Trust Checklist submitted", description: "Your checklist has been recorded." })
      onSubmitted()
    } catch (err: any) {
      if (err?.code === "23505") {
        toast({ title: "Already submitted", description: "You have already submitted your trust checklist.", variant: "destructive" })
        onSubmitted()
      } else {
        console.error("Error submitting trust checklist:", err)
        toast({ title: "Error", description: "Failed to submit checklist.", variant: "destructive" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-lg border border-border/30">
        <p className="text-sm text-muted-foreground">
          Use this checklist to ensure you have all the necessary components in place for establishing your trust. 
          Complete each item and provide the relevant details below.
        </p>
      </div>

      {/* Checklist */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist for Establishing a Trust</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST_ITEMS.map(item => (
            <div key={item} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/20">
              <Checkbox
                checked={checkedItems[item]}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [item]: !!checked }))}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-2">
                <span className="text-sm font-medium">{item}</span>
                <Input
                  value={notes[item] || ""}
                  onChange={e => setNotes(prev => ({ ...prev, [item]: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Add notes..."
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trust Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trust Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Trust Name</Label>
              <Input value={trustName} onChange={e => setTrustName(e.target.value)} className="h-9 text-sm" placeholder="Enter trust name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Designated Registered Agent</Label>
              <Input value={registeredAgent} onChange={e => setRegisteredAgent(e.target.value)} className="h-9 text-sm" placeholder="Enter registered agent" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mission Statement / Purpose</Label>
            <Textarea value={missionStatement} onChange={e => setMissionStatement(e.target.value)} className="text-sm min-h-[80px]" placeholder="Enter trust mission statement or purpose" />
          </div>
        </CardContent>
      </Card>

      {/* Grantor Responsibilities */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grantor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Grantor Name</Label>
            <Input value={grantorName} onChange={e => setGrantorName(e.target.value)} className="h-9 text-sm" placeholder="Full legal name of the grantor" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Trustee Name</Label>
              <Input value={trusteeName} onChange={e => setTrusteeName(e.target.value)} className="h-9 text-sm" placeholder="Selected trustee" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Successor Trustee</Label>
              <Input value={successorTrustee} onChange={e => setSuccessorTrustee(e.target.value)} className="h-9 text-sm" placeholder="Successor trustee name" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiaries */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Beneficiary Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Beneficiaries During Grantor's Lifetime</Label>
            <Textarea value={beneficiariesDuringLife} onChange={e => setBeneficiariesDuringLife(e.target.value)} className="text-sm min-h-[80px]" placeholder="List beneficiaries who will benefit while grantor is alive" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Beneficiaries After Grantor's Passing</Label>
            <Textarea value={beneficiariesAfterPassing} onChange={e => setBeneficiariesAfterPassing(e.target.value)} className="text-sm min-h-[80px]" placeholder="List who inherits specific assets after grantor's passing" />
          </div>
        </CardContent>
      </Card>

      {/* Management & Board */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Management & Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Management Instructions & Restrictions</Label>
            <Textarea value={managementInstructions} onChange={e => setManagementInstructions(e.target.value)} className="text-sm min-h-[80px]" placeholder="Instructions for trust administration, restrictions on asset distribution, conditions, etc." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prospective Board Members</Label>
            <Textarea value={boardMembers} onChange={e => setBoardMembers(e.target.value)} className="text-sm min-h-[80px]" placeholder="List prospective board members and their roles" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assets to Transfer to the Trust</Label>
            <Textarea value={assetsToTransfer} onChange={e => setAssetsToTransfer(e.target.value)} className="text-sm min-h-[80px]" placeholder="List assets to be transferred (personal property, real estate, life insurance, stocks, crypto, etc.)" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-[#ffb500] text-[#290a52] hover:bg-[#2eb2ff] hover:text-white">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit Trust Checklist
        </Button>
      </div>
    </div>
  )
}
