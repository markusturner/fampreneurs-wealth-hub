import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Calendar, MessageSquare, BookOpen, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  center?: boolean
}

const navItems: NavItem[] = [
  { name: 'Messenger', href: '/messenger', icon: Mail },
  { name: 'Calendar', href: '/workspace-calendar', icon: Calendar },
  { name: 'Community', href: '/workspace-community', icon: MessageSquare, center: true },
  { name: 'Classroom', href: '/classroom', icon: BookOpen },
]

// "More" menu items — all other app pages
const moreItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Family Office', href: '/digital-family-office' },
  { name: 'Family Constitution', href: '/documents' },
  { name: 'Family Calendar', href: '/calendar' },
  { name: 'Family Members', href: '/members' },
  { name: 'AI Chat', href: '/ai-chat' },
  { name: 'Trust Creation', href: '/trust-creation' },
  { name: 'Workspace Members', href: '/workspace-members' },
  { name: 'Profile Settings', href: '/profile-settings' },
]

export function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  const shouldShowNav = user && !location.pathname.includes('/sign-up') && !location.pathname.includes('/auth') && location.pathname !== '/'

  if (!shouldShowNav) return null

  const isActive = (href: string) => location.pathname === href
  const isMoreActive = moreItems.some(i => location.pathname === i.href)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
      <div className="mx-4 mb-4 rounded-2xl bg-card/90 backdrop-blur-2xl border border-border/40 shadow-2xl">
        <nav className="flex items-center justify-between px-3 py-2.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            if (item.center) {
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="flex items-center justify-center relative -mt-7"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                    active
                      ? "bg-accent text-accent-foreground shadow-accent/40 scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:scale-95"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center justify-center"
              >
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200",
                  active
                    ? "bg-accent/20 text-accent"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted/80 active:scale-95"
                )}>
                  <Icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                </div>
              </NavLink>
            )
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-center">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200",
                  isMoreActive
                    ? "bg-accent/20 text-accent"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted/80 active:scale-95"
                )}>
                  <MoreHorizontal className="h-5 w-5" />
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="text-left">All Apps</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 py-4">
                {moreItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => { navigate(item.href); setMoreOpen(false) }}
                    className={cn(
                      "text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-accent/20 text-accent"
                        : "bg-muted/40 text-foreground hover:bg-muted/70"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </div>
  )
}
