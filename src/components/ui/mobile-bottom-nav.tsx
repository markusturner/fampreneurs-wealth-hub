import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare, TrendingUp, FileText } from 'lucide-react'
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

const familyOfficeItems: NavItem[] = [
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Community', href: '/community', icon: TrendingUp },
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Members', href: '/members', icon: Users },
]

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const shouldShowNav = user && !location.pathname.includes('/sign-up') && !location.pathname.includes('/auth') && location.pathname !== '/'

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchUnreadCount = async () => {
      if (!user?.id || !shouldShowNav) return
      try {
        const { data, error } = await supabase.from('messages').select('id').eq('recipient_id', user.id).is('read_at', null)
        if (!error) setUnreadCount(data?.length || 0)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    if (shouldShowNav) {
      fetchUnreadCount()
      if (user?.id) {
        channel = supabase.channel(`unread_messages_${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, () => fetchUnreadCount()).subscribe()
      }
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel) } catch (error) { console.warn('Error removing channel:', error) }
      }
    }
  }, [user?.id, shouldShowNav])

  if (!shouldShowNav) return null

  const navigationItems = familyOfficeItems
  const itemsWithBadges = navigationItems.map(item => ({
    ...item,
    badge: item.href === '/members' && unreadCount > 0 ? unreadCount : undefined
  }))

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
      <div className="mx-3 mb-3 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-strong">
        <nav className="flex items-center justify-between px-2 py-2">
          {itemsWithBadges.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200",
                  "min-w-0 flex-1 relative touch-optimized",
                  isActive
                    ? "text-accent scale-110"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                {isActive && (
                  <div className="absolute -top-1 w-8 h-1 rounded-full bg-accent shadow-glow" />
                )}
                <Icon className={cn("h-6 w-6", isActive && "text-accent drop-shadow-lg")} />
                <span className={cn("text-[10px] mt-1 font-medium", isActive ? "text-accent" : "text-muted-foreground")}>{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
