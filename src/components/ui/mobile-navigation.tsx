import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const allNavigationItems = [
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Family Office', href: '/', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Scoreboard', href: '/members', icon: Users },
]

const familyOfficeOnlyItems = [
  { name: 'Family Office', href: '/', icon: Home },
]

export function MobileNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const [isFamilyOfficeOnly, setIsFamilyOfficeOnly] = useState(false)

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase.rpc('is_family_office_only_user', {
          user_id: user.id
        })

        if (!error) {
          setIsFamilyOfficeOnly(data)
        }
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }

    checkUserRole()
  }, [user?.id])

  const navigationItems = isFamilyOfficeOnly ? familyOfficeOnlyItems : allNavigationItems

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
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}