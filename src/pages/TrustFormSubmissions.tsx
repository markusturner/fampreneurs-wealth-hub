import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Loader2, Eye, RefreshCw } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

const TRUST_LABELS: Record<string, string> = {
  business: "Business Trust",
  ministry: "Ministry Trust",
  family: "Family Trust",
}

type SheetRow = Record<string, string>

export default function TrustFormSubmissions() {
  const { user } = useAuth()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<Record<string, SheetRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRow, setSelectedRow] = useState<{ type: string; row: SheetRow } | null>(null)
  const [activeTab, setActiveTab] = useState("business")

  useEffect(() => {
    if (isAdminOrOwner) fetchSheetData()
  }, [isAdminOrOwner])

  const fetchSheetData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke("fetch-trust-sheets")
      if (error) throw error
      setSubmissions(data?.submissions || {})
      if (isRefresh) {
        toast({ title: "Synced", description: "Trust form submissions refreshed from Google Sheets." })
      }
    } catch (err: any) {
      console.error("Error fetching trust sheets:", err)
      toast({ title: "Sync Failed", description: err.message || "Could not fetch sheet data.", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getTimestamp = (row: SheetRow): string => {
    // Google Forms typically puts timestamp in the first column
    const tsKey = Object.keys(row).find(k => k.toLowerCase().includes("timestamp")) || Object.keys(row)[0]
    return row[tsKey] || "—"
  }

  const getName = (row: SheetRow): string => {
    const nameKey = Object.keys(row).find(k =>
      k.toLowerCase().includes("name") && !k.toLowerCase().includes("trust")
    )
    return nameKey ? row[nameKey] : "—"
  }

  const totalCount = Object.values(submissions).reduce((sum, rows) => sum + rows.length, 0)

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin-settings")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent" />
              Trust Forms
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} total submission{totalCount !== 1 ? "s" : ""} from Google Forms
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSheetData(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing..." : "Sync from Sheets"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="business">
              Business ({submissions.business?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="ministry">
              Ministry ({submissions.ministry?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="family">
              Family ({submissions.family?.length || 0})
            </TabsTrigger>
          </TabsList>

          {(["business", "ministry", "family"] as const).map((type) => (
            <TabsContent key={type} value={type}>
              {!submissions[type] || submissions[type].length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No {TRUST_LABELS[type]} submissions yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {submissions[type].map((row, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base">{getName(row)}</CardTitle>
                          <Badge variant="outline">{TRUST_LABELS[type]}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm text-muted-foreground">
                            Submitted: {getTimestamp(row)}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => setSelectedRow({ type, row })}>
                            <Eye className="h-4 w-4 mr-1" /> View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              {selectedRow ? TRUST_LABELS[selectedRow.type] : ""} Submission
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedRow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(selectedRow.row).map(([key, value]) => (
                  <div key={key} className="space-y-0.5">
                    <p className="text-muted-foreground text-xs font-medium">{key}</p>
                    <p className="font-medium break-words">{value || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
