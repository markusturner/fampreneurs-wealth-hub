import { useSearchParams } from 'react-router-dom'

const TABS: { key: 'feed' | 'events' | 'leaderboard'; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'events', label: 'Events' },
  { key: 'leaderboard', label: 'Leaderboard' },
]

export type CommunityView = 'feed' | 'events' | 'leaderboard'

export function CommunityViewToggle({ value, onChange }: { value: CommunityView; onChange: (v: CommunityView) => void }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1">
        {TABS.map(t => {
          const active = t.key === value
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function useCommunityView(): [CommunityView, (v: CommunityView) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('view') as CommunityView | null
  const view: CommunityView = raw === 'events' || raw === 'leaderboard' ? raw : 'feed'
  const setView = (v: CommunityView) => {
    const next = new URLSearchParams(params)
    if (v === 'feed') next.delete('view')
    else next.set('view', v)
    setParams(next, { replace: true })
  }
  return [view, setView]
}
