import { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Props = {
  userId: string
  onWatchVideo: () => void
  onGoCommunity: () => void
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/truheirs/id6755499709'

type TaskId = 'video' | 'post' | 'app'

const TASKS: { id: TaskId; label: string }[] = [
  { id: 'video', label: 'Watch 60 second intro video' },
  { id: 'post', label: 'Read welcome post in the community' },
  { id: 'app', label: 'Download the app' },
]

export function StartHereChecklist({ userId, onWatchVideo, onGoCommunity }: Props) {
  const doneKey = `truheirs:startHere:done:${userId}`
  const [done, setDone] = useState<TaskId[]>([])
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(doneKey) || '[]')) } catch {}
  }, [userId])

  const complete = (id: TaskId) => {
    setDone(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try { localStorage.setItem(doneKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  if (done.length >= TASKS.length) return null

  const pct = Math.round((done.length / TASKS.length) * 100)

  const handle = (id: TaskId) => {
    complete(id)
    if (id === 'video') onWatchVideo()
    if (id === 'post') onGoCommunity()
    if (id === 'app') window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full max-w-md mb-5 text-left">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-1 py-1.5 group"
      >
        <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          Start here
        </span>
        <span className="flex-1 h-px bg-border relative overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 bg-secondary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="text-[10px] tracking-[0.15em] text-muted-foreground tabular-nums">
          {done.length}/{TASKS.length}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <ul className="pt-2 space-y-1">
            {TASKS.map(t => {
              const isDone = done.includes(t.id)
              return (
                <li key={t.id}>
                  <button
                    onClick={() => handle(t.id)}
                    className="w-full flex items-center gap-3 px-1 py-1.5 text-left rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isDone ? 'bg-secondary border-secondary' : 'border-border'
                      }`}
                    >
                      {isDone && <Check className="h-2.5 w-2.5 text-secondary-foreground" />}
                    </span>
                    <span className={`text-xs sm:text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {t.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
