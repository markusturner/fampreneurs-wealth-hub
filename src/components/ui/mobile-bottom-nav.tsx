import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Calendar, MessageSquare, BookOpen, LayoutGrid, LayoutDashboard, Home, FileText, Users, Bot, Shield, ScrollText, ClipboardList, FileCheck, Settings, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'

export function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const [moreOpen, setMoreOpen] = useState(false)

  const shouldShowNav = user && !location.pathname.includes('/sign-up') && !location.pathname.includes('/auth') && location.pathname !== '/'

  if (!shouldShowNav) return null

  // Derive the user's program slug for auto-routing
  const programName = profile?.program_name?.toLowerCase() || ''
  let programSlug = 'fbu'
  if (programName.includes('vault')) programSlug = 'tfv'
  else if (programName.includes('accelerator')) programSlug = 'tfba'
  else if (programName.includes('mastermind') || programName.includes('fortune')) programSlug = 'tffm'

  const communityHref = `/workspace-community?program=${programSlug}`
  const classroomHref = '/classroom'

  const isActive = (href: string) => {
    const [path, query] = href.split('?')
    if (location.pathname !== path) return false
    if (query) return location.search.includes(query)
    return true
  }

  const navItems = [
    { name: 'Messages', href: '/messenger', icon: Mail },
    { name: 'Calendar', href: '/workspace-calendar', icon: Calendar },
    { name: 'Community', href: communityHref, icon: MessageSquare, center: true },
    { name: 'Classroom', href: classroomHref, icon: BookOpen },
  ]

  const moreItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Family Office', href: '/digital-family-office', icon: Home },
    { name: 'Family Constitution', href: '/documents', icon: FileText },
    { name: 'Family Calendar', href: '/calendar', icon: Calendar },
    { name: 'Family Members', href: '/members', icon: Users },
    { name: 'AI Chat', href: '/ai-chat', icon: Bot },
    { name: 'Trust Creation', href: '/trust-creation', icon: ScrollText },
    { name: 'Workspace Members', href: '/workspace-members', icon: Users },
    { name: 'Profile Settings', href: '/profile-settings', icon: Settings },
  ]

  const adminItems = (isAdmin || isOwner) ? [
    { name: 'Admin Settings', href: '/admin-settings', icon: Shield },
    { name: 'Onboarding Form', href: '/onboarding-submissions', icon: ClipboardList },
    { name: 'Program Agreements', href: '/program-agreements', icon: FileCheck },
    { name: 'Trust Forms', href: '/trust-form-submissions', icon: FileText },
  ] : []

  const isMoreActive = [...moreItems, ...adminItems].some(i => location.pathname === i.href)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Subtle gradient fade above the bar */}
      <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <nav className="bg-card border-t border-border/30 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end justify-around py-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            if (item.center) {
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="flex flex-col items-center -mt-5"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md",
                    active
                      ? "bg-accent text-accent-foreground shadow-accent/30"
                      : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "text-[10px] mt-1 font-medium",
                    active ? "text-accent" : "text-muted-foreground"
                  )}>{item.name}</span>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex flex-col items-center gap-0.5 min-w-[3.5rem]"
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active ? "text-accent" : "text-muted-foreground"
                )}>{item.name}</span>
              </NavLink>
            )
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 min-w-[3.5rem]">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                  isMoreActive
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}>
                  <LayoutGrid className="h-[18px] w-[18px]" />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isMoreActive ? "text-accent" : "text-muted-foreground"
                )}>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl px-4 pt-3 pb-8 max-h-[75vh]">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.href
                  return (
                    <button
                      key={item.href}
                      onClick={() => { navigate(item.href); setMoreOpen(false) }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-foreground hover:bg-muted/50 active:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </button>
                  )
                })}

                {adminItems.length > 0 && (
                  <>
                    <div className="pt-2 pb-1 px-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</p>
                    </div>
                    {adminItems.map((item) => {
                      const Icon = item.icon
                      const active = location.pathname === item.href
                      return (
                        <button
                          key={item.href}
                          onClick={() => { navigate(item.href); setMoreOpen(false) }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                            active
                              ? "bg-accent/10 text-accent"
                              : "text-foreground hover:bg-muted/50 active:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Logout */}
                <div className="pt-3">
                  <button
                    onClick={() => { signOut(); setMoreOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  )
}
