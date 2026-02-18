import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, FileText, Loader2, Download, Eye } from "lucide-react"
import { useNavigate } from "react-router-dom"

type TrustSubmission = {
  id: string
  user_id: string
  trust_type: string
  form_data: any
  generated_document: string | null
  status: string
  created_at: string
}

const TRUST_LABELS: Record<string, string> = {
  business: "Business Trust",
  ministry: "Ministry Trust",
  family: "Family Trust",
}

export default function TrustFormSubmissions() {
  const { user } = useAuth()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<TrustSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<TrustSubmission | null>(null)

  useEffect(() => {
    if (isAdminOrOwner) fetchSubmissions()
  }, [isAdminOrOwner])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("trust_submissions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (err) {
      console.error("Error fetching trust submissions:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (sub: TrustSubmission) => {
    if (!sub.generated_document) return
    const blob = new Blob([sub.generated_document], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sub.form_data?.trust_name || sub.trust_type}_trust_document.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!isAdminOrOwner) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-settings")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-accent" />
            Trust Forms
          </h1>
          <p className="text-sm text-muted-foreground">Review all trust document submissions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trust form submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">
                    {(sub.form_data as any)?.trust_name || "Untitled Trust"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{TRUST_LABELS[sub.trust_type] || sub.trust_type}</Badge>
                    <Badge className={sub.status === "completed" ? "bg-green-600" : "bg-yellow-600"}>
                      {sub.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Settlor: {(sub.form_data as any)?.settlor_name || "N/A"}</p>
                    <p>Submitted: {new Date(sub.created_at).toLocaleDateString()}</p>
                    <p className="text-xs">User ID: {sub.user_id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(sub)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {sub.generated_document && (
                      <Button variant="outline" size="sm" onClick={() => handleDownload(sub)}>
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {(selectedSubmission?.form_data as any)?.trust_name || "Trust Submission"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(selectedSubmission.form_data as Record<string, any>).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-muted-foreground text-xs capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="font-medium">{Array.isArray(value) ? value.join(", ") : String(value || "—")}</p>
                    </div>
                  ))}
                </div>
                {selectedSubmission.generated_document && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Generated Document Preview</p>
                    <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                      {selectedSubmission.generated_document.slice(0, 2000)}
                      {selectedSubmission.generated_document.length > 2000 && "\n\n... (truncated)"}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
