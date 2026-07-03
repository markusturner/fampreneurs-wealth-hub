import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Scroll, Calendar, Users } from 'lucide-react'

const items = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Family Office', icon: Building2, path: '/digital-family-office' },
  { label: 'Family Constitution', icon: Scroll, path: '/family-constitution' },
  { label: 'Family Calendar', icon: Calendar, path: '/calendar' },
  { label: 'Family Members', icon: Users, path: '/members' },
]

export function FamilyToggleBar() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, icon: Icon, path }) => {
        const active = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
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
