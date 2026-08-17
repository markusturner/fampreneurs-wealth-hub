import { useSearchParams } from 'react-router-dom'

const TABS: { key: 'feed' | 'events' | 'leaderboard'; label: string; mobile: boolean }[] = [
  { key: 'feed', label: 'Feed', mobile: true },
  { key: 'events', label: 'Events', mobile: false },
  { key: 'leaderboard', label: 'Leaderboard', mobile: true },
]

export type CommunityView = 'feed' | 'events' | 'leaderboard'

export function CommunityViewToggle({ value, onChange, hideEvents }: { value: CommunityView; onChange: (v: CommunityView) => void; hideEvents?: boolean }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-xl p-1 border-2 border-[#290a52]">
        {TABS.filter(t => !(hideEvents && t.key === 'events')).map(t => {
          const active = t.key === value
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !t.mobile ? 'hidden md:inline-flex' : ''
              } ${
                active
                  ? 'bg-[#ffb500] text-[#290a52] shadow-sm'
                  : 'text-[#290a52] hover:text-white hover:bg-[#2eb2ff]'
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
