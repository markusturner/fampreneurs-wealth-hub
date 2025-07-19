import { Bell, Menu, Search, User, LogOut, Settings, Users, Home, X, BookOpen, Calendar, Crown, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { useAuth } from "@/contexts/AuthContext"
import { useFeedbackNotification } from "@/hooks/useFeedbackNotification"
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"

interface NavHeaderProps {
  onMenuClick?: () => void
}

export function NavHeader({ onMenuClick }: NavHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { shouldShowFeedback, markFeedbackShown, temporarilyHideNotification } = useFeedbackNotification()
  const navigate = useNavigate()
  const location = useLocation()

  const handleFeedbackClick = () => {
    setFeedbackDialogOpen(true)
    markFeedbackShown()
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    }
    if (profile?.display_name) {
      const names = profile.display_name.split(' ')
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`
        : names[0].charAt(0)
    }
    return 'U'
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>THE FAMPRENEURS</h1>
              <p className="text-xs text-muted-foreground">BUILDING STRONG LEGACIES</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>FAMPRENEURS</h1>
            </div>
          </div>
        </div>

        {/* Navigation Links - Desktop */}
        <div className="hidden lg:flex items-center gap-1 mx-4 xl:mx-6">
          <Button
            variant={location.pathname === '/' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 h-9"
          >
            <Home className="h-4 w-4" />
            Family Office
          </Button>
          <Button
            variant={location.pathname === '/community' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/community')}
            className="gap-2 h-9"
          >
            <Users className="h-4 w-4" />
            Community
          </Button>
          <Button
            variant={location.pathname === '/courses' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/courses')}
            className="gap-2 h-9"
          >
            <BookOpen className="h-4 w-4" />
            Courses
          </Button>
          <Button
            variant={location.pathname === '/coaching' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/coaching')}
            className="gap-2 h-9"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={location.pathname === '/members' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/members')}
            className="gap-2 h-9"
          >
            <Users className="h-4 w-4" />
            Scoreboard
          </Button>
        </div>

        {/* Search Bar - Visible on all devices */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-3 xl:mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search investments, documents, team..."
              className="pl-10 bg-muted/50 border-none focus:bg-background text-sm h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <ThemeToggle />
          
          {/* Mobile Search Button */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
          
          {/* Single Notification Bell for all notifications */}
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                    {getInitials()}
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.display_name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.family_role || 'Family Member'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile-settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/help')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Help</span>
              </DropdownMenuItem>
              {profile?.is_admin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Crown className="mr-2 h-4 w-4" />
                  <span>Admin Dashboard</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog 
        open={feedbackDialogOpen} 
        onOpenChange={setFeedbackDialogOpen}
      />
    </header>
  )
}