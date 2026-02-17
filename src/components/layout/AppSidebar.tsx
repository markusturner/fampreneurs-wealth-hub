import { useState } from "react"
import { TutorialVideoModal } from "@/components/dashboard/tutorial-video-modal"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useUserRole } from "@/hooks/useUserRole"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { useSubscription } from "@/hooks/useSubscription"
import { PricingPopup } from "@/components/dashboard/PricingPopup"
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
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"

interface NavItemProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  active?: boolean
  locked?: boolean
  onClick?: () => void
  children?: React.ReactNode
  defaultOpen?: boolean
}

function NavItem({ label, icon: Icon, href, active, locked, onClick, children, defaultOpen = false }: NavItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  const navigate = useNavigate()
  const hasChildren = !!children

  const handleClick = () => {
    if (locked) {
      onClick?.()
      return
    }
    if (hasChildren) {
      setOpen(!open)
    } else if (href) {
      navigate(href)
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
          "hover:bg-[#ffb500]/20 group",
          active && !hasChildren && "bg-[#ffb500]/20 text-sidebar-foreground font-medium",
          locked && "opacity-50 cursor-not-allowed"
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", active && !hasChildren && "text-[#ffb500]")} />
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        {hasChildren && !locked && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>
      {hasChildren && open && !locked && (
        <div className="ml-4 pl-3 border-l border-[#290a52] space-y-0.5 mt-0.5">
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
      onClick={() => {
        if (href) navigate(href)
        else if (onClick) onClick()
      }}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
        "hover:bg-[#ffb500]/20",
        active && "bg-[#ffb500]/20 text-sidebar-foreground font-medium"
      )}
    >
      {label}
    </button>
  )
}

export function AppSidebar({ className }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { subscriptionStatus } = useSubscription()
  const currentPath = location.pathname
  const [tutorialVideoOpen, setTutorialVideoOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)

  const isActive = (path: string) => currentPath === path

  // Owner and admin always have access
  const hasTruHeirsAccess = isAdmin || isOwner || subscriptionStatus.subscribed || subscriptionStatus.loading

  const handleLockedClick = () => {
    setPricingOpen(true)
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    }
    if (profile?.display_name) {
      const names = profile.display_name.split(' ')
      return names.length > 1 ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}` : names[0].charAt(0)
    }
    return "U"
  }

  return (
    <aside className={cn("flex flex-col w-64 border-r border-[#290a52] bg-sidebar-background h-screen sticky top-0", className)}>
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 px-5 py-4">
        <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs Logo" className="w-10 h-10 object-contain" />
        <span className="font-montserrat font-bold text-lg text-sidebar-foreground">TruHeirs</span>
      </div>

      {/* AI Chat Button */}
      <div className="px-3 pt-2 pb-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-dashed border-[#ffb500]/50 hover:bg-[#ffb500]/10 text-sidebar-foreground"
          onClick={() => navigate('/ai-chat')}
        >
          <Bot className="h-4 w-4 text-[#ffb500]" />
          AI Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {/* WORKSPACE */}
        <div className="mb-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace</p>
        </div>
        <div className="space-y-0.5">
          <NavItem label="Community" icon={MessageSquare} defaultOpen={currentPath.includes("/workspace-community")}>
            <SubNavItem label="Family Business University" href="/workspace-community?program=fbu" active={currentPath === "/workspace-community" && location.search.includes("program=fbu")} />
            <SubNavItem label="The Family Vault" href="/workspace-community?program=tfv" active={currentPath === "/workspace-community" && location.search.includes("program=tfv")} />
            <SubNavItem label="Family Business Accelerator" href="/workspace-community?program=tfba" active={currentPath === "/workspace-community" && location.search.includes("program=tfba")} />
          </NavItem>
          <NavItem label="Classroom" icon={BookOpen} href="/classroom" active={isActive("/classroom")} />
          <NavItem label="Members" icon={Users} href="/workspace-members" active={isActive("/workspace-members")} />
          <NavItem label="Calendar" icon={Calendar} href="/workspace-calendar" active={isActive("/workspace-calendar")} />
        </div>

        {/* TRUHEIRS */}
        <div className="mb-1 mt-4">
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">TruHeirs</p>
        </div>
        <div className="space-y-0.5">
          <NavItem label="Dashboard" icon={LayoutDashboard} href="/dashboard" active={isActive("/dashboard")} locked={!hasTruHeirsAccess} onClick={handleLockedClick} />
          <NavItem label="Family Office" icon={Home} href="/community" active={isActive("/community") && !location.search.includes("program=")} locked={!hasTruHeirsAccess} onClick={handleLockedClick} />
          <NavItem label="Family Constitution" icon={FileText} href="/documents" active={isActive("/documents")} locked={!hasTruHeirsAccess} onClick={handleLockedClick} />
          <NavItem label="Family Calendar" icon={Calendar} href="/family-governance" active={isActive("/family-governance")} locked={!hasTruHeirsAccess} onClick={handleLockedClick} />
          <NavItem label="Family Members" icon={Users} href="/investments" active={isActive("/investments")} locked={!hasTruHeirsAccess} onClick={handleLockedClick} />
        </div>

        {/* ADMIN */}
        {isAdmin && (
          <>
            <div className="mb-1 mt-4">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
            </div>
            <div className="space-y-0.5">
              <NavItem label="Admin Settings" icon={Shield} href="/admin-settings" active={isActive("/admin-settings")} />
            </div>
          </>
        )}
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-[#290a52] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#ffb500]/20" onClick={() => navigate('/search')} title="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#ffb500]/20" onClick={() => setTutorialVideoOpen(true)} title="Watch Tutorial">
            <Video className="h-4 w-4" />
          </Button>
          <NotificationBell />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#ffb500]/20 cursor-pointer" onClick={() => navigate("/profile-settings")}>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#290a52]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
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
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>

      {/* Tutorial Video Modal */}
      {profile && tutorialVideoOpen && (
        <TutorialVideoModal
          isOpen={tutorialVideoOpen}
          onClose={() => setTutorialVideoOpen(false)}
          onWatched={() => setTutorialVideoOpen(false)}
          onSkipped={() => setTutorialVideoOpen(false)}
          userId={profile.user_id}
        />
      )}

      {/* Pricing Popup */}
      <PricingPopup open={pricingOpen} onOpenChange={setPricingOpen} />
    </aside>
  )
}
