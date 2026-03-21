import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useAgreementStatus } from '@/hooks/useAgreementStatus'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

// T-shirt sizes removed - no longer collected in onboarding

const TOUCHPOINT_OPTIONS = [
  'Referral',
  'YouTube',
  'Instagram Reels/Ads',
  'Other',
]

const INVESTMENT_REASON_OPTIONS = [
  'My conviction & confidence',
  'Your value on YouTube/Instagram',
  'Knowledge & technical in-depth parts/systems',
  'Testimonials, proof & client results',
  'Lifestyle',
  'Trust feeling',
  'Relatability',
  'My story & speed of achievement',
]

const IMPROVEMENT_OPTIONS = [
  'Better sales call',
  'Better process with legacy coordinator',
  'Better content/different angles',
  'More testimonials',
  'Trust driven content',
  'Better marketing/stories/videos',
  'Other',
]

interface FormData {
  first_name: string
  last_name: string
  email_address: string
  phone_number: string
  first_touchpoint: string
  referral_who: string
  touchpoint_other: string
  decision_reason: string
  investment_reason: string
  join_elaboration: string
  time_to_decide: string
  improvement_suggestion: string
  improvement_other: string
  why_markus: string
  final_push: string
  pre_call_conviction: string
  biggest_hesitation: string
  why_choose_me: string
  specific_content: string
  anything_else: string
}

const STEPS = [
  { title: 'About You', fields: ['first_name', 'last_name', 'email_address', 'phone_number'] },
  { title: 'How You Found Us', fields: ['first_touchpoint', 'decision_reason'] },
  { title: 'Your Investment', fields: ['investment_reason', 'join_elaboration'] },
  { title: 'Your Journey', fields: ['time_to_decide', 'improvement_suggestion'] },
  { title: 'Why Us', fields: ['why_markus', 'final_push'] },
  { title: 'Your Conviction', fields: ['pre_call_conviction', 'biggest_hesitation'] },
  { title: 'Final Thoughts', fields: ['why_choose_me', 'specific_content', 'anything_else'] },
]

// Fields that are conditional and should not block progress
const CONDITIONAL_FIELDS = ['referral_who', 'touchpoint_other', 'improvement_other']

export default function Onboarding() {
  const { user, loading: authLoading, refreshProfile } = useAuth()
  const { signed: agreementSigned, loading: agreementLoading, needsAgreement } = useAgreementStatus()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email_address: '',
    phone_number: '',
    first_touchpoint: '',
    referral_who: '',
    touchpoint_other: '',
    decision_reason: '',
    investment_reason: '',
    join_elaboration: '',
    time_to_decide: '',
    improvement_suggestion: '',
    improvement_other: '',
    why_markus: '',
    final_push: '',
    pre_call_conviction: '',
    biggest_hesitation: '',
    why_choose_me: '',
    specific_content: '',
    anything_else: '',
  })

  // Owners/admins bypass onboarding
  useEffect(() => {
    if (!authLoading && !roleLoading && isAdminOrOwner) {
      navigate('/dashboard')
      return
    }
    if (!authLoading && !user) {
      navigate('/auth')
      return
    }
    if (!authLoading && !agreementLoading && user && needsAgreement && agreementSigned === false) {
      navigate('/program-agreement')
    }
  }, [authLoading, agreementLoading, roleLoading, isAdminOrOwner, user, needsAgreement, agreementSigned, navigate])

  if (authLoading || agreementLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!user || isAdminOrOwner) return null
  if (needsAgreement && agreementSigned === false) return null

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const currentFields = STEPS[step].fields as (keyof FormData)[]
  const optionalFields: (keyof FormData)[] = ['anything_else', ...CONDITIONAL_FIELDS as (keyof FormData)[]]

  const canProceed = (() => {
    for (const f of currentFields) {
      if (optionalFields.includes(f)) continue
      if (!form[f]?.trim()) return false
      // If Referral is selected, referral_who is required
      if (f === 'first_touchpoint' && form.first_touchpoint === 'Referral' && !form.referral_who?.trim()) return false
      // If Other is selected for touchpoint, touchpoint_other is required
      if (f === 'first_touchpoint' && form.first_touchpoint === 'Other' && !form.touchpoint_other?.trim()) return false
      // If improvement has Other, improvement_other is required
      if (f === 'improvement_suggestion' && form.improvement_suggestion.includes('Other') && !form.improvement_other?.trim()) return false
    }
    return true
  })()

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      // Build the submission, merging conditional fields into their parents
      let firstTouchpoint = form.first_touchpoint
      if (form.first_touchpoint === 'Referral' && form.referral_who) {
        firstTouchpoint = `Referral - ${form.referral_who}`
      }
      if (form.first_touchpoint === 'Other' && form.touchpoint_other) {
        firstTouchpoint = `Other: ${form.touchpoint_other}`
      }
      let improvementSuggestion = form.improvement_suggestion
      if (form.improvement_suggestion.includes('Other') && form.improvement_other) {
        improvementSuggestion = form.improvement_suggestion.replace('Other', `Other: ${form.improvement_other}`)
      }

      const { error } = await supabase.from('onboarding_responses').insert({
        user_id: user.id,
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        tshirt_size: '',
        mailing_address: '',
        first_touchpoint: firstTouchpoint,
        decision_reason: form.decision_reason,
        investment_reason: form.investment_reason,
        join_elaboration: form.join_elaboration,
        time_to_decide: form.time_to_decide,
        improvement_suggestion: improvementSuggestion,
        why_markus: form.why_markus,
        final_push: form.final_push,
        pre_call_conviction: form.pre_call_conviction,
        biggest_hesitation: form.biggest_hesitation,
        why_choose_me: form.why_choose_me,
        specific_content: form.specific_content,
        anything_else: form.anything_else,
      })
      if (error) throw error

      // Update the user's profile with collected info
      const displayName = `${form.first_name} ${form.last_name}`.trim()
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          display_name: displayName,
          email: form.email_address,
          phone: form.phone_number,
          needs_profile_completion: false,
        })
        .eq('user_id', user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }

      await refreshProfile()
      toast({ title: 'Onboarding complete!', description: 'Redirecting to book your onboarding call…' })
      window.location.href = 'https://calendly.com/apexathletemgnt/fampreneurs-onboarding'
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Error', description: err.message || 'Failed to save. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  const renderField = (field: keyof FormData) => {
    switch (field) {
      case 'first_name':
        return (
          <div className="space-y-2" key={field}>
            <Label>First Name *</Label>
            <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
          </div>
        )
      case 'last_name':
        return (
          <div className="space-y-2" key={field}>
            <Label>Last Name *</Label>
            <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" />
          </div>
        )
      case 'email_address':
        return (
          <div className="space-y-2" key={field}>
            <Label>Email Address *</Label>
            <Input type="email" value={form.email_address} onChange={e => set('email_address', e.target.value)} placeholder="john@example.com" />
          </div>
        )
      case 'phone_number':
        return (
          <div className="space-y-2" key={field}>
            <Label>Phone Number *</Label>
            <Input type="tel" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="(555) 123-4567" />
          </div>
        )
      case 'first_touchpoint':
        return (
          <div className="space-y-2" key={field}>
            <Label>What was the first touchpoint of knowing us? *</Label>
            <Select value={form.first_touchpoint} onValueChange={v => { set('first_touchpoint', v); if (v !== 'Referral') set('referral_who', ''); if (v !== 'Other') set('touchpoint_other', '') }}>
              <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
              <SelectContent>
                {TOUCHPOINT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.first_touchpoint === 'Referral' && (
              <div className="mt-2">
                <Label>Who referred you? *</Label>
                <Input value={form.referral_who} onChange={e => set('referral_who', e.target.value)} placeholder="Name of the person who referred you" className="mt-1" />
              </div>
            )}
            {form.first_touchpoint === 'Other' && (
              <div className="mt-2">
                <Label>Please specify *</Label>
                <Input value={form.touchpoint_other} onChange={e => set('touchpoint_other', e.target.value)} placeholder="How did you find us?" className="mt-1" />
              </div>
            )}
          </div>
        )
      case 'decision_reason':
        return (
          <div className="space-y-2" key={field}>
            <Label>What made you make the decision to do this? *</Label>
            <Textarea value={form.decision_reason} onChange={e => set('decision_reason', e.target.value)} placeholder="Tell us what drove your decision…" rows={4} />
          </div>
        )
      case 'investment_reason':
        return (
          <div className="space-y-2" key={field}>
            <Label>What made you invest into our program? *</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {INVESTMENT_REASON_OPTIONS.map(o => (
                <Button
                  key={o}
                  type="button"
                  variant={form.investment_reason.includes(o) ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const current = form.investment_reason ? form.investment_reason.split(', ') : []
                    const updated = current.includes(o) ? current.filter(c => c !== o) : [...current, o]
                    set('investment_reason', updated.join(', '))
                  }}
                >
                  {o}
                </Button>
              ))}
            </div>
          </div>
        )
      case 'join_elaboration':
        return (
          <div className="space-y-2" key={field}>
            <Label>Please elaborate on what specifically made you join — be completely honest *</Label>
            <Textarea value={form.join_elaboration} onChange={e => set('join_elaboration', e.target.value)} placeholder="This will be super helpful…" rows={4} />
          </div>
        )
      case 'time_to_decide':
        return (
          <div className="space-y-2" key={field}>
            <Label>How long did it take you to decide to start working with us? *</Label>
            <Input value={form.time_to_decide} onChange={e => set('time_to_decide', e.target.value)} placeholder="e.g. 2 weeks, 3 months…" />
          </div>
        )
      case 'improvement_suggestion':
        return (
          <div className="space-y-2" key={field}>
            <Label>What could we have improved to make you invest earlier? *</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {IMPROVEMENT_OPTIONS.map(o => (
                <Button
                  key={o}
                  type="button"
                  variant={form.improvement_suggestion.includes(o) ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const current = form.improvement_suggestion ? form.improvement_suggestion.split(', ') : []
                    const updated = current.includes(o) ? current.filter(c => c !== o) : [...current, o]
                    set('improvement_suggestion', updated.join(', '))
                    if (!updated.includes('Other')) set('improvement_other', '')
                  }}
                >
                  {o}
                </Button>
              ))}
            </div>
            {form.improvement_suggestion.includes('Other') && (
              <div className="mt-2">
                <Label>Please specify what could be improved *</Label>
                <Input value={form.improvement_other} onChange={e => set('improvement_other', e.target.value)} placeholder="Your suggestion..." className="mt-1" />
              </div>
            )}
          </div>
        )
      case 'why_markus':
        return (
          <div className="space-y-2" key={field}>
            <Label>What made you want to work specifically with Markus Turner? *</Label>
            <Textarea value={form.why_markus} onChange={e => set('why_markus', e.target.value)} rows={4} />
          </div>
        )
      case 'final_push':
        return (
          <div className="space-y-2" key={field}>
            <Label>What was the final thing that pushed you over the line? *</Label>
            <Textarea value={form.final_push} onChange={e => set('final_push', e.target.value)} placeholder="A specific story, testimonial, long form asset, someone else?" rows={4} />
          </div>
        )
      case 'pre_call_conviction':
        return (
          <div className="space-y-2" key={field}>
            <Label>Before the call, how convinced were you that you'd sign up (1-10)? *</Label>
            <Textarea value={form.pre_call_conviction} onChange={e => set('pre_call_conviction', e.target.value)} placeholder="Mention what made you unsure or extremely sure." rows={3} />
          </div>
        )
      case 'biggest_hesitation':
        return (
          <div className="space-y-2" key={field}>
            <Label>What were your biggest hesitations before joining? *</Label>
            <Textarea value={form.biggest_hesitation} onChange={e => set('biggest_hesitation', e.target.value)} placeholder="Was it price, timing, or something else?" rows={3} />
          </div>
        )
      case 'why_choose_me':
        return (
          <div className="space-y-2" key={field}>
            <Label>There are lots of others that do something similar — why choose us? *</Label>
            <Textarea value={form.why_choose_me} onChange={e => set('why_choose_me', e.target.value)} placeholder="Be as specific as possible." rows={4} />
          </div>
        )
      case 'specific_content':
        return (
          <div className="space-y-2" key={field}>
            <Label>What specific thing was said in our content that made you join? *</Label>
            <Textarea value={form.specific_content} onChange={e => set('specific_content', e.target.value)} placeholder="Something that stood out…" rows={3} />
          </div>
        )
      case 'anything_else':
        return (
          <div className="space-y-2" key={field}>
            <Label>Anything else you want to share about what made you convert?</Label>
            <Textarea value={form.anything_else} onChange={e => set('anything_else', e.target.value)} placeholder="Optional" rows={3} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-12 h-12 mx-auto mb-2 object-contain" />
          <CardTitle className="text-2xl">Welcome to Fampreneurs</CardTitle>
          <CardDescription>Step {step + 1} of {STEPS.length} — {STEPS[step].title}</CardDescription>
          <Progress value={progress} className="mt-3" />
        </CardHeader>
        <CardContent className="space-y-6">
          {currentFields.map(renderField)}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed || submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-1" /> Complete & Book Call</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
