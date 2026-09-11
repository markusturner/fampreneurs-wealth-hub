import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { SurveyForm } from '@/components/surveys/SurveyForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Survey, SurveyQuestion } from '@/hooks/useWeeklySurvey'

export default function SurveyPublic() {
  const { surveyId } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      let query = supabase.from('surveys').select('*').eq('is_active', true)
      query = surveyId
        ? query.eq('id', surveyId)
        : query.eq('is_weekly', true).order('created_at').limit(1)

      const { data } = await query.limit(1).maybeSingle()
      if (data) {
        setSurvey(data as Survey)
        const { data: q } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', (data as Survey).id)
          .order('position')
        setQuestions((q || []) as SurveyQuestion[])
      }
      setLoading(false)
    }
    load()
  }, [surveyId])

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <Helmet>
        <title>{survey ? `${survey.title} | TruHeirs` : 'Survey | TruHeirs'}</title>
        <meta name="description" content={survey?.description || 'Share your feedback with the TruHeirs team. Anonymous and takes only a few minutes.'} />
      </Helmet>

      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-8 h-8 object-contain" />
          <span className="font-montserrat font-bold">TruHeirs</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !survey ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">This survey is not available.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Anonymous check-in</p>
              <CardTitle className="text-xl">{survey.title}</CardTitle>
              <CardDescription>
                {survey.description || 'Your answers are anonymous. No name or email is collected.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SurveyForm survey={survey} questions={questions} anonymous />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
