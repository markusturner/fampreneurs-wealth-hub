import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface SurveyQuestion {
  id: string
  survey_id: string
  question_text: string
  question_type: string
  options: string[]
  section: string | null
  required: boolean
  position: number
}

export interface Survey {
  id: string
  title: string
  description: string | null
  is_active: boolean
  is_weekly: boolean
}

/** Most recent Friday 9:00am US Eastern, as a Date */
export function lastFridayNineEastern(now = new Date()) {
  // Eastern is UTC-4 (EDT) / UTC-5 (EST); use -4 as the app's stated EST offset window
  const easternNow = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const d = new Date(Date.UTC(
    easternNow.getUTCFullYear(), easternNow.getUTCMonth(), easternNow.getUTCDate(), 9, 0, 0
  ))
  const day = d.getUTCDay() // 5 = Friday
  const diff = (day - 5 + 7) % 7
  d.setUTCDate(d.getUTCDate() - diff)
  if (d.getTime() > easternNow.getTime()) d.setUTCDate(d.getUTCDate() - 7)
  return new Date(d.getTime() + 4 * 60 * 60 * 1000)
}

/** True only during Friday 9:00am -> 11:59pm US Eastern */
export function isSurveyWindowOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find(p => p.type === 'weekday')?.value
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  return weekday === 'Fri' && hour >= 9
}

export function useWeeklySurvey() {
  const { user } = useAuth()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [needsSubmission, setNeedsSubmission] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user?.id) { setLoading(false); return }
    if (!isSurveyWindowOpen()) { setNeedsSubmission(false); setLoading(false); return }

    try {
      const { data: s } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_weekly', true)
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle()

      if (!s) { setLoading(false); return }
      setSurvey(s as Survey)

      const { data: q } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', s.id)
        .order('position')
      setQuestions((q || []) as SurveyQuestion[])

      const since = lastFridayNineEastern().toISOString()
      const { data: existing } = await supabase
        .from('survey_submissions')
        .select('id')
        .eq('survey_id', s.id)
        .eq('user_id', user.id)
        .gte('submitted_at', since)
        .limit(1)

      const dismissKey = `survey_dismissed_${s.id}_${since.slice(0, 10)}`
      const dismissed = localStorage.getItem(dismissKey) === '1'
      setNeedsSubmission(!(existing && existing.length > 0) && !dismissed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const dismiss = () => {
    if (!survey) return
    const since = lastFridayNineEastern().toISOString()
    localStorage.setItem(`survey_dismissed_${survey.id}_${since.slice(0, 10)}`, '1')
    setNeedsSubmission(false)
  }

  return { survey, questions, needsSubmission, loading, dismiss, refresh: load }
}
