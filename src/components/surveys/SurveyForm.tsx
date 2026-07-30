import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Check } from 'lucide-react'
import type { Survey, SurveyQuestion } from '@/hooks/useWeeklySurvey'

interface Props {
  survey: Survey
  questions: SurveyQuestion[]
  onSubmitted?: () => void
  compact?: boolean
}

export function SurveyForm({ survey, questions, onSubmitted, compact }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const setAnswer = (id: string, value: string) =>
    setAnswers(prev => ({ ...prev, [id]: value }))

  const handleSubmit = async () => {
    if (!user?.id) return
    const missing = questions.find(q => q.required && !answers[q.id]?.trim())
    if (missing) {
      toast({ title: 'One more thing', description: 'Please answer all required questions.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const { data: submission, error } = await supabase
        .from('survey_submissions')
        .insert({ survey_id: survey.id, user_id: user.id })
        .select('id')
        .single()
      if (error) throw error

      const rows = questions
        .filter(q => answers[q.id])
        .map(q => ({
          submission_id: submission.id,
          question_id: q.id,
          answer_text: q.question_type === 'scale' ? null : answers[q.id],
          answer_number: q.question_type === 'scale' ? Number(answers[q.id]) : null,
        }))

      if (rows.length) {
        const { error: aErr } = await supabase.from('survey_answers').insert(rows)
        if (aErr) throw aErr
      }

      setDone(true)
      toast({ title: 'Thank you!', description: 'Your answers were submitted.' })
      onSubmitted?.()
    } catch (e) {
      console.error(e)
      toast({ title: 'Could not submit', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-secondary-foreground" />
        </div>
        <p className="text-lg font-semibold">All set</p>
        <p className="text-sm text-muted-foreground">Thanks for checking in this week.</p>
      </div>
    )
  }

  let lastSection: string | null = null

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      {questions.map((q, i) => {
        const showSection = q.section && q.section !== lastSection
        lastSection = q.section
        return (
          <div key={q.id} className="space-y-2">
            {showSection && (
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground pt-2">{q.section}</p>
            )}
            <Label className="text-sm font-medium leading-snug block">
              {i + 1}. {q.question_text}
              {q.required && <span className="text-destructive"> *</span>}
            </Label>

            {q.question_type === 'scale' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from({ length: 10 }, (_, n) => n + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAnswer(q.id, String(n))}
                    className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                      answers[q.id] === String(n)
                        ? 'bg-sidebar text-sidebar-foreground border-sidebar'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {(q.question_type === 'single_choice' || q.question_type === 'multi_choice') && (
              <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswer(q.id, v)} className="pt-1">
                {(q.options || []).map(opt => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.question_type === 'short_text' && (
              <Input value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} placeholder="Your answer" />
            )}

            {q.question_type === 'long_text' && (
              <Textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                placeholder="Your answer"
                className="min-h-[80px] resize-y"
              />
            )}
          </div>
        )
      })}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit
      </Button>
    </div>
  )
}
