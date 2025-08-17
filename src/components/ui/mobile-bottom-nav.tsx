import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare, TrendingUp, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const allNavigationItems: NavItem[] = [
  { name: 'Family Office', href: '/community', icon: Home },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
  { name: 'Dashboard', href: '/', icon: Settings },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Documents', href: '/documents', icon: FileText },
]

const familyOfficeOnlyItems: NavItem[] = [
  { name: 'Family Office', href: '/community', icon: Home },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
  { name: 'Dashboard', href: '/', icon: Settings },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Documents', href: '/documents', icon: FileText },
]

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const [isFamilyOfficeOnly, setIsFamilyOfficeOnly] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id')
          .eq('recipient_id', user.id)
          .is('read_at', null)

        if (!error) {
          setUnreadCount(data?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    // Subscribe to new messages
    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const navigationItems = isFamilyOfficeOnly ? familyOfficeOnlyItems : allNavigationItems

  // Add unread count to Members nav item
  const itemsWithBadges = navigationItems.map(item => ({
    ...item,
    badge: item.href === '/members' ? unreadCount : undefined
  }))

  const isAdminRoute = false // Admin functionality removed

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-nav-blur md:hidden">
      <div className="px-2 pb-safe">
        <nav className="flex items-center justify-center py-2 max-w-md mx-auto gap-1">
          {itemsWithBadges.map((item, index) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            const isDashboard = item.name === 'Dashboard'

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 touch-optimized",
                  "min-w-0 flex-1 relative touch-target",
                  "px-2 py-3 max-w-[75px]",
                  isDashboard && "mx-1", // Extra spacing for center dashboard
                  isActive 
                    ? "text-[#ffb500] bg-[#ffb500]/20 shadow-lg transform scale-105 border border-[#ffb500]/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 hover:shadow-md"
                )}
              >
                <Icon className={cn(
                  "transition-all duration-300", 
                  isDashboard ? "h-6 w-6" : "h-5 w-5",
                  isActive && "text-[#ffb500] drop-shadow-md scale-110"
                )} />
                <span className={cn(
                  "text-[9px] font-semibold leading-tight transition-all duration-300 text-center",
                  isDashboard && "text-[8px]",
                  isActive ? "text-[#ffb500]" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-background shadow-lg pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}