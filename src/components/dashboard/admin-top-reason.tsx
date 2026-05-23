import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Sparkles, Quote } from 'lucide-react'

interface ThemeBucket {
  key: string
  label: string
  keywords: string[]
  count: number
  quotes: string[]
}

const THEMES: Omit<ThemeBucket, 'count' | 'quotes'>[] = [
  { key: 'family', label: 'Protect & provide for family', keywords: ['family', 'wife', 'husband', 'spouse', 'kids', 'children', 'son', 'daughter', 'parents', 'loved ones'] },
  { key: 'legacy', label: 'Build a generational legacy', keywords: ['legacy', 'generation', 'inherit', 'inheritance', 'pass down', 'pass on', 'heirs'] },
  { key: 'trust', label: 'Set up trusts the right way', keywords: ['trust', 'trusts', 'estate', 'planning', 'asset protect'] },
  { key: 'taxes', label: 'Reduce taxes & keep more', keywords: ['tax', 'taxes', 'irs', 'tax-exempt', 'write off', 'write-off'] },
  { key: 'freedom', label: 'Financial freedom & control', keywords: ['freedom', 'control', 'sovereign', 'independence', 'wealth', 'rich'] },
  { key: 'business', label: 'Grow & protect the business', keywords: ['business', 'company', 'llc', 'corporation', 'operations'] },
  { key: 'markus', label: 'Trust in Markus & his teaching', keywords: ['markus', 'mentor', 'teacher', 'coach', 'authentic', 'genuine', 'real', 'truth'] },
  { key: 'community', label: 'Be part of the community', keywords: ['community', 'people', 'members', 'group', 'support', 'tribe'] },
  { key: 'protection', label: 'Asset & lawsuit protection', keywords: ['protect', 'protection', 'lawsuit', 'sued', 'liability', 'shield'] },
  { key: 'education', label: 'Learn & gain knowledge', keywords: ['learn', 'education', 'knowledge', 'understand', 'school', 'training'] },
  { key: 'results', label: 'Proven results & success stories', keywords: ['result', 'results', 'success', 'testimonial', 'proof', 'work'] },
]

export function AdminTopReason() {
  const [loading, setLoading] = useState(true)
  const [buckets, setBuckets] = useState<ThemeBucket[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('onboarding_responses')
        .select('decision_reason, investment_reason, why_markus, why_choose_me, final_push, join_elaboration')
      const rows = data || []
      setTotal(rows.length)

      const initialised: ThemeBucket[] = THEMES.map(t => ({ ...t, count: 0, quotes: [] }))

      for (const r of rows as any[]) {
        const text = [r.decision_reason, r.investment_reason, r.why_markus, r.why_choose_me, r.final_push, r.join_elaboration]
          .filter(Boolean).join(' \n ').toLowerCase()
        if (!text.trim()) continue
        for (const b of initialised) {
          if (b.keywords.some(k => text.includes(k))) {
            b.count++
            const quote = (r.decision_reason || r.why_markus || r.why_choose_me || r.investment_reason || r.final_push || r.join_elaboration || '').toString().trim()
            if (quote && b.quotes.length < 2 && quote.length < 240) b.quotes.push(quote)
          }
        }
      }

      initialised.sort((a, b) => b.count - a.count)
      setBuckets(initialised)
      setLoading(false)
    }
    run()
  }, [])

  if (loading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
    )
  }

  const top = buckets[0]
  const runners = buckets.slice(1, 4).filter(b => b.count > 0)

  return (
    <Card className="border-[#ffb500]/40 bg-gradient-to-br from-[#ffb500]/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#ffb500]" />
              #1 Reason People Joined
            </CardTitle>
            <CardDescription>Based on {total} onboarding responses.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!top || top.count === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough responses yet to identify a top reason.</p>
        ) : (
          <>
            <div className="rounded-xl border border-[#ffb500]/40 bg-[#ffb500]/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Theme</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1 text-foreground">{top.label}</h3>
                </div>
                <Badge className="bg-[#290a52] text-white border-0">{top.count} mentions</Badge>
              </div>
              {top.quotes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {top.quotes.map((q, i) => (
                    <div key={i} className="flex gap-2 text-sm text-foreground/85 italic">
                      <Quote className="h-3.5 w-3.5 text-[#ffb500] shrink-0 mt-1" />
                      <p>"{q}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {runners.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Also Mentioned</p>
                <div className="space-y-1.5">
                  {runners.map((b, idx) => (
                    <div key={b.key} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5">
                      <span><span className="text-muted-foreground mr-2">#{idx + 2}</span>{b.label}</span>
                      <span className="text-muted-foreground text-xs">{b.count} mentions</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
