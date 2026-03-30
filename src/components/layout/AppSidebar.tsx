import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useUserRole } from "@/hooks/useUserRole"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { useSubscription } from "@/hooks/useSubscription"
import { StripePaymentModal } from "@/components/dashboard/StripePaymentModal"
import {
  Bot,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  ChevronDown,
  BookOpen,
  Users,
  Home,
  FileText,
  Shield,
  Lock,
  LogOut,
  Search,
  Mail,
  ScrollText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ProgramId } from "@/lib/stripe-programs"

interface NavItemProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  active?: boolean
  locked?: boolean
  onClick?: () => void
  children?: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

function NavItem({ label, icon: Icon, href, active, locked, onClick, children, defaultOpen = false, className: extraClassName }: NavItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  const navigate = useNavigate()
  const hasChildren = !!children

  const handleClick = () => {
    if (locked) {
      // Just navigate — the LockedPageOverlay on that page handles the blurred view + unlock prompt
      if (href) navigate(href)
      return
    }
    if (hasChildren) { setOpen(!open) }
    else if (href) { navigate(href) }
    else if (onClick) { onClick() }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
          "hover:bg-sidebar-accent/60 group",
          active && !hasChildren && "bg-accent/20 text-accent font-medium",
          locked && "opacity-60",
          extraClassName
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", active && !hasChildren && "text-accent", extraClassName && extraClassName)} />
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        {hasChildren && !locked && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>
      {hasChildren && open && !locked && (
        <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

function SubNavItem({ label, href, active, onClick }: { label: string; href?: string; active?: boolean; onClick?: () => void }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => { if (href) navigate(href); else if (onClick) onClick() }}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
        "hover:bg-sidebar-accent/60",
        active && "bg-accent/20 text-accent font-medium"
      )}
    >
      {label}
    </button>
  )
}

// Search suggestions with access requirements
const SEARCH_SUGGESTIONS = [
  { label: 'Dashboard', path: '/dashboard', requiresSubscription: true },
  { label: 'Family Office', path: '/digital-family-office', requiresSubscription: true },
  { label: 'Family Constitution', path: '/documents', requiresSubscription: true },
  { label: 'Calendar', path: '/calendar', requiresSubscription: true },
  { label: 'Members', path: '/members', requiresSubscription: true },
  { label: 'AI Chat', path: '/ai-chat', requiresSubscription: false },
  { label: 'Community', path: '/workspace-community', requiresSubscription: false },
  { label: 'Classroom', path: '/classroom', requiresSubscription: false },
  { label: 'Messenger', path: '/messenger', requiresSubscription: false },
  { label: 'Profile Settings', path: '/profile-settings', requiresSubscription: false },
  { label: 'Admin Settings', path: '/admin-settings', requiresAdmin: true },
]

export function AppSidebar({ className }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { isAdmin, isFamilyOfficeOnly, isFamilyMember } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { subscriptionStatus } = useSubscription()
  const currentPath = location.pathname
  const [pricingOpen, setPricingOpen] = useState(false)
  const [pricingProgram, setPricingProgram] = useState<ProgramId | undefined>(undefined)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Admins/owners always have access. Users explicitly granted truheirs_access by admin (e.g. invited trustees)
  // also get full access without needing a Stripe subscription.
  const hasTruHeirsAccess = isAdmin || isOwner || profile?.truheirs_access === true || (subscriptionStatus.subscribed || subscriptionStatus.loading)

  const filteredSuggestions = SEARCH_SUGGESTIONS.filter(s => {
    // Filter by access
    if (s.requiresAdmin && !isAdmin && !isOwner) return false
    if (s.requiresSubscription && !hasTruHeirsAccess) return false
    // Filter by query
    if (searchQuery && !s.label.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [searchOpen])

  const isActive = (path: string) => currentPath === path
  const handleLockedClick = (programId?: ProgramId) => {
    setPricingProgram(programId)
    setPricingOpen(true)
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    if (profile?.display_name) {
      const names = profile.display_name.split(' ')
      return names.length > 1 ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}` : names[0].charAt(0)
    }
    return "U"
  }

  return (
    <aside className={cn("flex flex-col w-64 h-screen sticky top-0 bg-sidebar text-sidebar-foreground", className)}>
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs Logo" className="w-10 h-10 object-contain" />
        <span className="font-montserrat font-bold text-lg text-sidebar-foreground">TruHeirs</span>
      </div>

      {/* AI Chat Button */}
      <div className="px-3 pb-2">
        <Button
          className="w-full justify-start gap-2 rounded-xl font-semibold bg-[hsl(210,100%,58%)]/10 text-[hsl(210,100%,58%)] hover:bg-[hsl(210,100%,58%)]/20 border-0"
          variant="ghost"
          onClick={() => navigate('/ai-chat')}
        >
          <Bot className="h-4 w-4" />
          AI Chat
        </Button>
      </div>

      {/* Trust Creation - hidden for invited family members */}
      {!isFamilyMember && (
        <div className="px-3 pb-3">
          <Button
            className={cn(
              "w-full justify-start gap-2 rounded-xl font-semibold border-0",
              currentPath.includes("/trust-creation")
                ? "bg-[hsl(43,100%,50%)] text-[hsl(270,80%,15%)] hover:bg-[hsl(43,100%,45%)] shadow-md shadow-[hsl(43,100%,50%)]/30"
                : "bg-[hsl(43,100%,50%)]/15 text-[hsl(43,100%,50%)] hover:bg-[hsl(43,100%,50%)]/25"
            )}
            variant="ghost"
            onClick={() => navigate('/trust-creation')}
          >
            <ScrollText className="h-4 w-4" />
            Trust Creation
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-1">
        {/* WORKSPACE - show if not family-office-only, OR if user has a program assigned (admin-invited users) */}
        {(!isFamilyOfficeOnly || isAdmin || isOwner || isFamilyMember || !!profile?.program_name) && (
          <>
            <div className="mb-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community</p>
            </div>
            <div className="space-y-0.5">
              <NavItem label="Community" icon={MessageSquare} defaultOpen={currentPath.includes("/workspace-community")}>
                <SubNavItem label="Family Business University" href="/workspace-community?program=fbu" active={currentPath === "/workspace-community" && location.search.includes("program=fbu")} />
                <SubNavItem label="The Family Vault" href="/workspace-community?program=tfv" active={currentPath === "/workspace-community" && location.search.includes("program=tfv")} />
                <SubNavItem label="The Family Business Accelerator" href="/workspace-community?program=tfba" active={currentPath === "/workspace-community" && location.search.includes("program=tfba")} />
                <SubNavItem label="The Family Fortune Mastermind" href="/workspace-community?program=tffm" active={currentPath === "/workspace-community" && location.search.includes("program=tffm")} />
              </NavItem>
              <NavItem label="Classroom" icon={BookOpen} href="/classroom" active={isActive("/classroom")} />
              <NavItem label="Members" icon={Users} href="/workspace-members" active={isActive("/workspace-members")} />
              <NavItem label="Calendar" icon={Calendar} href="/workspace-calendar" active={isActive("/workspace-calendar")} />
              
              <NavItem label="Messenger" icon={Mail} href="/messenger" active={isActive("/messenger")} />
            </div>
          </>
        )}

        {/* DIGITAL FAMILY OFFICE */}
        <div className="mb-1 mt-5">
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Digital Family Office</p>
        </div>
        <div className="space-y-0.5">
          <>
              <NavItem label="Dashboard" icon={LayoutDashboard} href="/dashboard" active={isActive("/dashboard")} locked={!hasTruHeirsAccess} onClick={() => handleLockedClick('fbu')} />
              <NavItem label="Family Office" icon={Home} href="/digital-family-office" active={isActive("/digital-family-office")} locked={!hasTruHeirsAccess} onClick={() => handleLockedClick('fbu')} />
              <NavItem label="Family Constitution" icon={FileText} href="/documents" active={isActive("/documents")} locked={!hasTruHeirsAccess} onClick={() => handleLockedClick('fbu')} />
              <NavItem label="Family Calendar" icon={Calendar} href="/calendar" active={isActive("/calendar")} locked={!hasTruHeirsAccess} onClick={() => handleLockedClick('fbu')} />
              <NavItem label="Family Members" icon={Users} href="/members" active={isActive("/members")} locked={!hasTruHeirsAccess} onClick={() => handleLockedClick('fbu')} />
            </>
        </div>

        {/* ADMIN */}
        {(isAdmin || isOwner) && (
          <>
            <div className="mb-1 mt-5">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
            </div>
            <div className="space-y-0.5">
              <NavItem label="Admin Settings" icon={Shield} href="/admin-settings" active={isActive("/admin-settings")} />
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-evenly">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sidebar-accent/60 rounded-lg" title="Search">
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-64 p-2">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
                      navigate(filteredSuggestions[0].path)
                      setSearchOpen(false)
                      setSearchQuery('')
                    }
                  }}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredSuggestions.map(s => (
                  <button key={s.path} className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors" onClick={() => { navigate(s.path); setSearchOpen(false); setSearchQuery('') }}>
                    {s.label}
                  </button>
                ))}
                {filteredSuggestions.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No results</p>}
              </div>
            </PopoverContent>
          </Popover>
          <NotificationBell />
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-sidebar-accent/60 cursor-pointer transition-smooth" onClick={() => navigate("/profile-settings")}>
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-accent/30">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                {getInitials()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{profile?.display_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.family_role || "Member"}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>

      <StripePaymentModal open={pricingOpen} onOpenChange={setPricingOpen} programFilter={pricingProgram} title="Unlock TruHeirs" />
    </aside>
  )
}
