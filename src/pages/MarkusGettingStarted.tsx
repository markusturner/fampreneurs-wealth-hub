import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { MarkusPage, MARKUS_NAV_ICONS } from '@/components/markus/MarkusNav'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { MARKUS_GETTING_STARTED_STEPS } from '@/lib/markus-member'
import { cn } from '@/lib/utils'

const storageKey = (userId?: string) => `markus-getting-started:${userId ?? 'guest'}`

// Simple checklist that walks new members through each Markus AI tool.
export default function MarkusGettingStarted() {
  const { user } = useAuth()
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey(user?.id)) || '[]')) } catch { setDone([]) }
  }, [user?.id])

  const toggle = (key: string) => {
    setDone((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      try { localStorage.setItem(storageKey(user?.id), JSON.stringify(next)) } catch { /* storage full or blocked */ }
      return next
    })
  }

  const total = MARKUS_GETTING_STARTED_STEPS.length
  const count = MARKUS_GETTING_STARTED_STEPS.filter((s) => done.includes(s.key)).length

  return (
    <MarkusPage title="Getting Started" description="Follow these steps to get the most out of Markus AI. Check each one off as you go.">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Your progress</span>
          <span className="text-muted-foreground">{count} of {total} done</span>
        </div>
        <Progress value={(count / total) * 100} className="mt-3 h-2" />
      </div>
      <ol className="mt-5 space-y-3">
        {MARKUS_GETTING_STARTED_STEPS.map((step, i) => {
          const Icon = MARKUS_NAV_ICONS[step.key]
          const checked = done.includes(step.key)
          return (
            <li key={step.key} className={cn('flex items-start gap-4 rounded-2xl border bg-card p-4 sm:p-5', checked ? 'border-primary/40' : 'border-border')}>
              <button type="button" onClick={() => toggle(step.key)} aria-label={checked ? `Mark "${step.title}" not done` : `Mark "${step.title}" done`} className="mt-0.5 shrink-0 text-primary">
                {checked ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />Step {i + 1}
                </div>
                <h2 className={cn('mt-1 font-montserrat text-base font-bold', checked && 'text-muted-foreground line-through')}>{step.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                <Link to={step.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  {step.action}<ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          )
        })}
      </ol>
    </MarkusPage>
  )
}
