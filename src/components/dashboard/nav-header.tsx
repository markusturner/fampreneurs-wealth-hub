import { Bell, Menu, Search, User, LogOut, Settings, Users, Home, X, BookOpen, Calendar, Crown, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog"
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
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                  <Button
                    variant={location.pathname === '/' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/')}
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={location.pathname === '/community' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/community')}
                  >
                    <Users className="h-4 w-4" />
                    Community
                  </Button>
                  <Button
                    variant={location.pathname === '/courses' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/courses')}
                  >
                    <BookOpen className="h-4 w-4" />
                    Courses
                  </Button>
                  <Button
                    variant={location.pathname === '/coaching' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/coaching')}
                  >
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </Button>
                  <Button
                    variant={location.pathname === '/members' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/members')}
                  >
                    <Users className="h-4 w-4" />
                    Members
                  </Button>
                  <Button
                    variant={location.pathname === '/profile-settings' ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation('/profile-settings')}
                  >
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>THE FAMPRENEURS</h1>
              <p className="text-xs text-muted-foreground">BUILDING STRONG LEGACIES</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>THE FAMPRENEURS</h1>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-2 mx-6">
          <Button
            variant={location.pathname === '/' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={location.pathname === '/community' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/community')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Community
          </Button>
          <Button
            variant={location.pathname === '/courses' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/courses')}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Courses
          </Button>
          <Button
            variant={location.pathname === '/coaching' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/coaching')}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={location.pathname === '/members' ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/members')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Members
          </Button>
        </div>

        <div className="flex-1 max-w-lg mx-2 sm:mx-4 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search investments, documents, team..."
              className="pl-10 bg-muted/50 border-none focus:bg-background text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <DropdownMenu onOpenChange={(open) => {
            if (open && shouldShowFeedback) {
              temporarilyHideNotification()
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {shouldShowFeedback && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive-foreground">1</span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {shouldShowFeedback ? (
                <DropdownMenuItem onClick={handleFeedbackClick} className="p-4">
                  <div className="flex items-start gap-3 w-full">
                    <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Program Feedback Request</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Help us improve! Share your thoughts about the program and your experience.
                      </div>
                      <div className="text-xs text-primary mt-2 font-medium">
                        Click to provide feedback →
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No new notifications</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
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
              {profile?.is_admin && (
                <DropdownMenuItem onClick={() => navigate('/profile-settings')}>
                  <Crown className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
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