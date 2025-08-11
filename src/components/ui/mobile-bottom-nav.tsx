import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare, TrendingUp } from 'lucide-react'
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
  { name: 'Home', href: '/', icon: Home },
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
]

const familyOfficeOnlyItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
      <nav className="flex items-center justify-between px-2 py-2 max-w-xl mx-auto gap-1">
        {itemsWithBadges.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200",
                "min-w-0 flex-1 text-xs font-medium relative",
                isActive 
                  ? "text-[#ffb500] bg-[#ffb500]/10 scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95"
              )}
            >
                <Icon className={cn("h-5 w-5", isActive && "text-[#ffb500]")} />
              <span className="sr-only">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}