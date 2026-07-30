import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SurveyForm } from '@/components/surveys/SurveyForm'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Sparkles, Loader2, ClipboardList } from 'lucide-react'

interface Survey { id: string; title: string; description: string | null; is_active: boolean; is_weekly: boolean }
interface Question {
  id: string; survey_id: string; question_text: string; question_type: string
  options: string[]; section: string | null; required: boolean; position: number
}
interface Submission { id: string; user_id: string; submitted_at: string; name?: string }
interface Answer { question_id: string; answer_text: string | null; answer_number: number | null; submission_id: string }

const TYPES = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'scale', label: 'Scale 1-10' },
  { value: 'single_choice', label: 'Multiple choice' },
]

export default function Surveys() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const { toast } = useToast()

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)

  const survey = surveys.find(s => s.id === activeId) || null

  const loadSurveys = async () => {
    const { data } = await supabase.from('surveys').select('*').order('created_at')
    const list = (data || []) as Survey[]
    setSurveys(list)
    if (!activeId && list.length) setActiveId(list[0].id)
    setLoading(false)
  }

  const loadDetail = async (id: string) => {
    const { data: q } = await supabase.from('survey_questions').select('*').eq('survey_id', id).order('position')
    setQuestions((q || []) as Question[])

    const { data: subs } = await supabase
      .from('survey_submissions').select('id, user_id, submitted_at')
      .eq('survey_id', id).order('submitted_at', { ascending: false })
    const subList = (subs || []) as Submission[]

    if (subList.length) {
      const { data: profs } = await supabase
        .from('profiles').select('user_id, display_name, first_name, last_name')
        .in('user_id', subList.map(s => s.user_id))
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member']))
      subList.forEach(s => { s.name = map.get(s.user_id) || 'Member' })

      const { data: ans } = await supabase
        .from('survey_answers').select('submission_id, question_id, answer_text, answer_number')
        .in('submission_id', subList.map(s => s.id))
      setAnswers((ans || []) as Answer[])
    } else {
      setAnswers([])
    }
    setSubmissions(subList)
  }

  useEffect(() => { loadSurveys() }, [])
  useEffect(() => { if (activeId) { setInsights(''); loadDetail(activeId) } }, [activeId])

  const mySubmissions = useMemo(
    () => submissions.filter(s => s.user_id === user?.id),
    [submissions, user?.id]
  )

  /* ---------- admin question editing ---------- */
  const persist = async (q: Question, patch: Partial<Question>) => {
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('survey_questions').update(patch as any).eq('id', q.id)
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= questions.length) return
    const reordered = [...questions]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    const withPos = reordered.map((q, i) => ({ ...q, position: i + 1 }))
    setQuestions(withPos)
    await Promise.all(withPos.map(q => supabase.from('survey_questions').update({ position: q.position }).eq('id', q.id)))
  }

  const addQuestion = async () => {
    if (!survey) return
    const { data, error } = await supabase.from('survey_questions').insert({
      survey_id: survey.id,
      question_text: 'New question',
      question_type: 'short_text',
      options: [],
      section: questions[questions.length - 1]?.section ?? null,
      required: true,
      position: questions.length + 1,
    }).select('*').single()
    if (error) { toast({ title: 'Could not add', description: error.message, variant: 'destructive' }); return }
    setQuestions(prev => [...prev, data as Question])
  }

  const removeQuestion = async (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    await supabase.from('survey_questions').delete().eq('id', id)
  }

  const analyze = async () => {
    if (!survey) return
    setAnalyzing(true)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-survey-results', { body: { surveyId: survey.id } })
      if (error) throw error
      setInsights(data?.insights || 'No insights returned.')
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' })
    } finally {
      setAnalyzing(false)
    }
  }

  /* ---------- per-question stats ---------- */
  const statsFor = (q: Question) => {
    const rows = answers.filter(a => a.question_id === q.id)
    if (q.question_type === 'scale') {
      const nums = rows.map(r => Number(r.answer_number)).filter(n => !isNaN(n))
      const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : '—'
      return { count: rows.length, summary: `Avg ${avg} / 10`, texts: [] as string[], breakdown: [] as [string, number][] }
    }
    if (q.question_type === 'single_choice') {
      const counts = new Map<string, number>()
      rows.forEach(r => { if (r.answer_text) counts.set(r.answer_text, (counts.get(r.answer_text) || 0) + 1) })
      return { count: rows.length, summary: '', texts: [], breakdown: [...counts.entries()] as [string, number][] }
    }
    return { count: rows.length, summary: '', texts: rows.map(r => r.answer_text || '').filter(Boolean).slice(0, 8), breakdown: [] as [string, number][] }
  }

  if (loading || roleLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="container mx-auto max-w-5xl py-4 md:py-8 px-3 sm:px-4 space-y-6 pb-20 md:pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">Surveys</h1>
          <p className="text-sm text-muted-foreground">Sent to every member each Friday at 9:00am ET</p>
        </div>
      </div>

      {surveys.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {surveys.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                s.id === activeId ? 'bg-sidebar text-sidebar-foreground border-sidebar' : 'border-border hover:bg-muted'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {!survey ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No surveys yet.</CardContent></Card>
      ) : !isAdminOrOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{survey.title}</CardTitle>
            {survey.description && <CardDescription>{survey.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            {mySubmissions.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                You last submitted on {new Date(mySubmissions[0].submitted_at).toLocaleDateString()}
              </p>
            )}
            <SurveyForm survey={survey as any} questions={questions as any} onSubmitted={() => loadDetail(survey.id)} />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="results" className="space-y-5">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          {/* RESULTS */}
          <TabsContent value="results" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Submissions</p><p className="text-2xl font-bold">{submissions.length}</p></CardContent></Card>
              <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Questions</p><p className="text-2xl font-bold">{questions.length}</p></CardContent></Card>
              <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Last response</p><p className="text-sm font-semibold pt-1">{submissions[0] ? new Date(submissions[0].submitted_at).toLocaleDateString() : '—'}</p></CardContent></Card>
            </div>

            {questions.map((q, i) => {
              const st = statsFor(q)
              return (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium leading-snug">{i + 1}. {q.question_text}</CardTitle>
                    <CardDescription className="text-xs">{st.count} answers {st.summary && `· ${st.summary}`}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {st.breakdown.map(([opt, n]) => (
                      <div key={opt} className="space-y-1">
                        <div className="flex justify-between text-xs"><span>{opt}</span><span className="text-muted-foreground">{n}</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-sidebar" style={{ width: `${st.count ? (n / st.count) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                    {st.texts.map((t, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground border-l-2 border-border pl-3">{t}</p>
                    ))}
                    {st.count === 0 && <p className="text-sm text-muted-foreground">No answers yet.</p>}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* SUBMISSIONS */}
          <TabsContent value="submissions" className="space-y-3">
            {submissions.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-3 opacity-40" />No submissions yet.
              </CardContent></Card>
            )}
            {submissions.map(s => (
              <Card key={s.id}>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{s.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{new Date(s.submitted_at).toLocaleString()}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questions.map(q => {
                    const a = answers.find(x => x.submission_id === s.id && x.question_id === q.id)
                    if (!a) return null
                    return (
                      <div key={q.id}>
                        <p className="text-xs font-medium">{q.question_text}</p>
                        <p className="text-sm text-muted-foreground">{a.answer_text ?? a.answer_number}</p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">What members are telling you</CardTitle>
                  <CardDescription>Biggest problem and best thing, from all submissions</CardDescription>
                </div>
                <Button onClick={analyze} disabled={analyzing} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Analyze
                </Button>
              </CardHeader>
              <CardContent>
                {insights ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{insights}</ReactMarkdown></div>
                ) : (
                  <p className="text-sm text-muted-foreground">Click Analyze to read the summary.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EDIT */}
          <TabsContent value="edit" className="space-y-3">
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={survey.title}
                    onChange={e => setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, title: e.target.value } : s))}
                    onBlur={e => supabase.from('surveys').update({ title: e.target.value }).eq('id', survey.id)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={survey.description || ''}
                    onChange={e => setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, description: e.target.value } : s))}
                    onBlur={e => supabase.from('surveys').update({ description: e.target.value }).eq('id', survey.id)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={survey.is_weekly}
                    onCheckedChange={async v => {
                      setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, is_weekly: v } : s))
                      await supabase.from('surveys').update({ is_weekly: v }).eq('id', survey.id)
                    }}
                  />
                  <span className="text-sm">Send automatically every Friday at 9:00am ET</span>
                </div>
              </CardContent>
            </Card>

            {questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground pt-3 w-5">{i + 1}.</span>
                    <Textarea
                      value={q.question_text}
                      onChange={e => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, question_text: e.target.value } : x))}
                      onBlur={e => persist(q, { question_text: e.target.value })}
                      className="min-h-[60px]"
                    />
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuestion(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-7">
                    <Select value={q.question_type} onValueChange={v => persist(q, { question_type: v })}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 w-40 text-xs"
                      placeholder="Section"
                      value={q.section || ''}
                      onChange={e => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, section: e.target.value } : x))}
                      onBlur={e => persist(q, { section: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch checked={q.required} onCheckedChange={v => persist(q, { required: v })} />
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                  </div>
                  {q.question_type === 'single_choice' && (
                    <div className="pl-7">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Choices, separated by commas"
                        defaultValue={(q.options || []).join(', ')}
                        onBlur={e => persist(q, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) as any })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add question
            </Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
