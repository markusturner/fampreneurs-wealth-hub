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

// Navigation for family office members (full access)
const familyOfficeItems: NavItem[] = [
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Investments', href: '/investments', icon: TrendingUp },
  { name: 'Home', href: '/', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Members', href: '/members', icon: Users },
]

// Navigation for family members (limited access)
const familyMemberItems: NavItem[] = [
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Home', href: '/', icon: Home },
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

  const navigationItems = isFamilyOfficeOnly ? familyMemberItems : familyOfficeItems

  // Add unread count to Members nav item
  const itemsWithBadges = navigationItems.map(item => ({
    ...item,
    badge: item.href === '/members' && unreadCount > 0 ? unreadCount : undefined
  }))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
      <div className="safe-area-bottom">
        <div className="flex justify-around items-center py-1 px-2 max-w-lg mx-auto">
          {itemsWithBadges.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === "/" && location.pathname === "/")

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center min-w-0 flex-1 py-1.5 px-1 relative",
                  "text-xs font-medium transition-all duration-200 rounded-lg touch-target",
                  "active:scale-95 touch-manipulation",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "text-primary scale-110" : "text-muted-foreground"
                    )} 
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs truncate max-w-full transition-all duration-200 leading-tight",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}