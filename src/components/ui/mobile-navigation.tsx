import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Members', href: '/members', icon: Users },
]

export function MobileNavigation() {
  const location = useLocation()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <nav className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors",
                "min-w-0 flex-1 text-xs font-medium",
                isActive 
                  ? "text-[#ffb500] bg-[#ffb500]/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-[#ffb500]")} />
              <span className="truncate">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}