import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import {
  ASSET_COLS,
  ASSET_SECTIONS,
  Column,
  downloadAssetInventoryPdf,
  estateDocRows,
  filledRows,
} from "@/lib/asset-inventory-doc"

export default function AssetInventoryPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<any>(null)
  const [submitterName, setSubmitterName] = useState("")
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      let query = supabase
        .from("trust_submissions")
        .select("id, form_data, submitter_name, created_at")
        .eq("user_id", user.id)
        .eq("trust_type", "asset_inventory")
        .order("created_at", { ascending: false })
        .limit(1)
      if (id) query = supabase
        .from("trust_submissions")
        .select("id, form_data, submitter_name, created_at")
        .eq("id", id)
        .limit(1)

      const { data, error } = await query
      if (error) {
        console.error(error)
        toast({ title: "Error", description: "Could not load your asset inventory.", variant: "destructive" })
      }
      const row: any = data?.[0]
      if (row) {
        setFormData(row.form_data)
        setSubmitterName(row.submitter_name || "")
        setSubmittedAt(row.created_at)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  const renderTable = (title: string, head: string[], body: string[][]) => {
    if (!body.length) return null
    return (
      <Card key={title} className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#290a52] text-white">
                {head.map(h => (
                  <th key={h} className="text-left font-semibold px-3 py-2 border border-border/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2 border border-border/40 align-top">{c || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/trust-creation")}>
          <ArrowLeft className="h-4 w-4" /> Back to Trust Creation
        </Button>
        <p className="text-sm text-muted-foreground">No asset inventory found yet.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/trust-creation")}>
          <ArrowLeft className="h-4 w-4" /> Back to Trust Creation
        </Button>
        <Button
          onClick={() => downloadAssetInventoryPdf(formData, submitterName)}
          className="gap-2 bg-[#ffb500] hover:bg-[#2eb2ff] text-[#290a52] hover:text-white"
        >
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div className="rounded-xl bg-[#290a52] text-white p-6">
        <h1 className="text-2xl font-bold text-[#ffb500]">Asset Inventory</h1>
        <p className="text-sm text-white/80 mt-1">
          {submitterName || "Prepared"} • {submittedAt ? new Date(submittedAt).toLocaleDateString() : ""}
        </p>
      </div>

      {renderTable(
        "Family & Beneficiary Information",
        ASSET_COLS.beneficiaries.map(c => c.label),
        filledRows(ASSET_COLS.beneficiaries, formData.beneficiaries)
      )}

      {renderTable("Estate Planning Documents", ["Document", "Have It?", "Location"], estateDocRows(formData.estateDocStatus))}

      {ASSET_SECTIONS.filter(s => s.key !== "beneficiaries").map(({ key, title }) => {
        const cols = ASSET_COLS[key] as Column[]
        return renderTable(title, cols.map(c => c.label), filledRows(cols, formData[key]))
      })}
    </div>
  )
}
