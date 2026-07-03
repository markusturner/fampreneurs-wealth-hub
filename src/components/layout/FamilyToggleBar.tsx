import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Scroll, Calendar, Users } from 'lucide-react'

export type FamilyTab = 'dashboard' | 'office' | 'constitution' | 'calendar' | 'members'

const items: { label: string; icon: any; tab: FamilyTab; path: string }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard', path: '/dashboard' },
  { label: 'Family Office', icon: Building2, tab: 'office', path: '/digital-family-office' },
  { label: 'Family Constitution', icon: Scroll, tab: 'constitution', path: '/family-constitution' },
  { label: 'Family Calendar', icon: Calendar, tab: 'calendar', path: '/calendar' },
  { label: 'Family Members', icon: Users, tab: 'members', path: '/members' },
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
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, icon: Icon, tab, path }) => {
        const active = controlled ? value === tab : location.pathname === path
        return (
          <button
            key={tab}
            onClick={() => (controlled ? onChange!(tab) : navigate(path))}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              active
                ? 'bg-[#290a52] text-white border-[#290a52]'
                : 'bg-background text-foreground border-border hover:border-[#2eb2ff] hover:text-[#2eb2ff]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
