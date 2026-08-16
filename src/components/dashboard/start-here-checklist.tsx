import { useEffect, useState } from 'react'
import { Check, Circle } from 'lucide-react'

type Props = {
  userId: string
  onWatchVideo: () => void
  onGoCommunity: () => void
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/truheirs/id6755499709'

type TaskId = 'video' | 'post' | 'app'

const TASKS: { id: TaskId; label: string }[] = [
  { id: 'video', label: 'Watch 60 minute intro video' },
  { id: 'post', label: 'Read welcome post in the community' },
  { id: 'app', label: 'Download the app' },
]

export function StartHereChecklist({ userId, onWatchVideo, onGoCommunity }: Props) {
  const doneKey = `truheirs:startHere:done:${userId}`
  const dismissKey = `truheirs:startHere:dismissed:${userId}`
  const [done, setDone] = useState<TaskId[]>([])
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(doneKey) || '[]'))
      setDismissed(localStorage.getItem(dismissKey) === 'true')
    } catch { setDismissed(false) }
  }, [userId])

  const complete = (id: TaskId) => {
    setDone(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try { localStorage.setItem(doneKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, 'true') } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  const pct = Math.round((done.length / TASKS.length) * 100)
  const r = 9
  const c = 2 * Math.PI * r

  const handle = (id: TaskId) => {
    complete(id)
    if (id === 'video') onWatchVideo()
    if (id === 'post') onGoCommunity()
    if (id === 'app') window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full max-w-xl mb-5 rounded-xl border border-border bg-card text-left overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
            <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" className="stroke-muted" />
            <circle
              cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round"
              className="stroke-secondary transition-all duration-500"
              strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
            />
          </svg>
          <span className="text-sm font-semibold text-foreground">Welcome! Start here</span>
        </div>
        <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Dismiss
        </button>
      </div>
      <ul className="px-4 py-3 space-y-2.5">
        {TASKS.map(t => {
          const isDone = done.includes(t.id)
          return (
            <li key={t.id} className="flex items-center gap-3">
              {isDone ? (
                <span className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-secondary-foreground" />
                </span>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => handle(t.id)}
                className={`text-sm text-left hover:underline ${isDone ? 'text-muted-foreground' : 'text-accent'}`}
              >
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
