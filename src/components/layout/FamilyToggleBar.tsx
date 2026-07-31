import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Landmark, HeartHandshake } from 'lucide-react'

export type FamilyTab = 'dashboard' | 'office' | 'governance' | 'handoff'

const items: { label: string; short: string; icon: any; tab: FamilyTab; paths: string[] }[] = [
  { label: 'Dashboard', short: 'Home', icon: LayoutDashboard, tab: 'dashboard', paths: ['/dashboard'] },
  { label: 'Family Office', short: 'Office', icon: Building2, tab: 'office', paths: ['/digital-family-office'] },
  { label: 'Governance', short: 'Govern', icon: Landmark, tab: 'governance', paths: ['/family-constitution', '/calendar', '/members'] },
  { label: 'Handoff', short: 'Handoff', icon: HeartHandshake, tab: 'handoff', paths: ['/handoff'] },
]

interface Props {
  value?: FamilyTab
  onChange?: (tab: FamilyTab) => void
}

export function FamilyToggleBar({ value, onChange }: Props = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const controlled = !!onChange

  return (
    <div className="w-full flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        {items.map(({ label, short, icon: Icon, tab, paths }) => {
          const active = controlled ? value === tab : paths.includes(location.pathname)
          return (
            <button
              key={tab}
              onClick={() => (controlled ? onChange!(tab) : navigate(paths[0]))}
              title={label}
              className={`relative flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                active
                  ? 'bg-foreground text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{label}</span>
              <span className="sm:hidden whitespace-nowrap">{short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
