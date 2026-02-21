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
      <nav className="bg-card/95 backdrop-blur-xl border-t border-border/20 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            if (item.center) {
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="flex items-center justify-center"
                >
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200",
                    active
                      ? "bg-accent text-accent-foreground shadow-md shadow-accent/25"
                      : "bg-primary/10 text-primary hover:bg-primary/20 active:scale-95"
                  )}>
                    <Icon className="h-5 w-5" />
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
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  active
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}>
                  <Icon className="h-5 w-5" />
                  {active && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent" />}
                </div>
              </NavLink>
            )
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  isMoreActive
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}>
                  <LayoutGrid className="h-5 w-5" />
                  {isMoreActive && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent" />}
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl px-4 pt-3 pb-8 max-h-[75vh] overflow-hidden flex flex-col">
              {/* Handle */}
              <div className="flex justify-center mb-4 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 -mx-1 px-1">
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
