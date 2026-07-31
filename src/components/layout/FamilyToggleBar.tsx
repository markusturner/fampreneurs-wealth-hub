import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Scroll, Calendar, Users } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

export type FamilyTab = 'dashboard' | 'office' | 'constitution' | 'calendar' | 'members'

const items: { label: string; short: string; icon: any; tab: FamilyTab; path: string }[] = [
  { label: 'Dashboard', short: 'Dash', icon: LayoutDashboard, tab: 'dashboard', path: '/dashboard' },
  { label: 'Family Office', short: 'Office', icon: Building2, tab: 'office', path: '/digital-family-office' },
  { label: 'Family Constitution', short: 'Constitution', icon: Scroll, tab: 'constitution', path: '/family-constitution' },
  { label: 'Family Calendar', short: 'Calendar', icon: Calendar, tab: 'calendar', path: '/calendar' },
  { label: 'Family Members', short: 'Members', icon: Users, tab: 'members', path: '/members' },
]

interface Props {
  value?: FamilyTab
  onChange?: (tab: FamilyTab) => void
}

export function FamilyToggleBar({ value, onChange }: Props = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const controlled = !!onChange
  return (
    <div className="w-full flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        {items.map(({ label, short, icon: Icon, tab, path }) => {
          const active = controlled ? value === tab : location.pathname === path
          return (
            <button
              key={tab}
              onClick={() => (controlled ? onChange!(tab) : navigate(path))}
              title={label}
              className={`relative flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                active
                  ? 'bg-foreground text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{label}</span>
              <span className="sm:hidden whitespace-nowrap">{isMobile ? short : label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

