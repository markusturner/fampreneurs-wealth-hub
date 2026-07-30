import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SurveyForm } from './SurveyForm'
import { useWeeklySurvey } from '@/hooks/useWeeklySurvey'

export function WeeklySurveyPopup() {
  const { survey, questions, needsSubmission, loading, dismiss, refresh } = useWeeklySurvey()

  if (loading || !survey || !needsSubmission || questions.length === 0) return null

  return (
    <Dialog open onOpenChange={open => { if (!open) dismiss() }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogHeader className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Weekly Check-In</p>
            <DialogTitle className="text-xl">{survey.title}</DialogTitle>
            {survey.description && (
              <DialogDescription className="text-sm">{survey.description}</DialogDescription>
            )}
          </DialogHeader>
        </div>
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          <SurveyForm survey={survey} questions={questions} compact onSubmitted={() => { refresh(); setTimeout(dismiss, 1500) }} />
        </div>
        <div className="px-6 py-3 border-t border-border/60 flex justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">Remind me later</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
