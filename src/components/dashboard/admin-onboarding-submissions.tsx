import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Eye, Users, Calendar } from "lucide-react"
import { format } from "date-fns"

interface OnboardingResponse {
  id: string
  user_id: string
  full_name: string | null
  tshirt_size: string | null
  mailing_address: string | null
  first_touchpoint: string | null
  decision_reason: string | null
  investment_reason: string | null
  join_elaboration: string | null
  time_to_decide: string | null
  improvement_suggestion: string | null
  why_markus: string | null
  final_push: string | null
  pre_call_conviction: string | null
  biggest_hesitation: string | null
  why_choose_me: string | null
  specific_content: string | null
  anything_else: string | null
  completed_at: string | null
  created_at: string
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  tshirt_size: "T-Shirt Size",
  mailing_address: "Mailing Address",
  first_touchpoint: "How did you first hear about us?",
  decision_reason: "What made you decide to join?",
  investment_reason: "Why are you investing in this program?",
  join_elaboration: "Tell us more about why you joined",
  time_to_decide: "How long did it take to decide?",
  improvement_suggestion: "What could we improve?",
  why_markus: "Why Markus?",
  final_push: "What was the final push?",
  pre_call_conviction: "Conviction before the call?",
  biggest_hesitation: "Biggest hesitation?",
  why_choose_me: "Why did you choose us?",
  specific_content: "What specific content are you looking for?",
  anything_else: "Anything else?",
}

export function AdminOnboardingSubmissions() {
  const [submissions, setSubmissions] = useState<OnboardingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<OnboardingResponse | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("onboarding_responses")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (err) {
      console.error("Error fetching onboarding submissions:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Onboarding Submissions</CardTitle>
            </div>
            <Badge variant="secondary">{submissions.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No onboarding submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-smooth cursor-pointer border border-border/50"
                  onClick={() => setSelectedSubmission(sub)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sub.full_name || "Unknown User"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {sub.completed_at ? format(new Date(sub.completed_at), "MMM d, yyyy 'at' h:mm a") : format(new Date(sub.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.completed_at ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">Completed</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Partial</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.full_name || "Submission Details"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4">
              {selectedSubmission && Object.entries(FIELD_LABELS).map(([key, label]) => {
                const value = (selectedSubmission as any)[key]
                if (!value) return null
                return (
                  <div key={key} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{value}</p>
                  </div>
                )
              })}
              {selectedSubmission?.completed_at && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed At</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                    {format(new Date(selectedSubmission.completed_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
