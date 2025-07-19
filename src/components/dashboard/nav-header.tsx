import { Bell, Menu, Search, User, LogOut, Settings, Users, Home, X, BookOpen, Calendar, Crown, MessageSquare, PanelLeft } from "lucide-react"
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
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useIsMobile } from "@/hooks/use-mobile"

interface NavHeaderProps {
  onMenuClick?: () => void
}

export function NavHeader({ onMenuClick }: NavHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { profile, signOut } = useAuth()
  const { shouldShowFeedback, markFeedbackShown, temporarilyHideNotification } = useFeedbackNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

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

  const fetchSearchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([])
      return
    }

    try {
      const suggestions = new Set<string>()
      
      // Search in community posts
      const { data: posts } = await supabase
        .from('community_posts')
        .select('content')
        .ilike('content', `%${query}%`)
        .limit(5)
      
      posts?.forEach(post => {
        const words = post.content.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.includes(query.toLowerCase()) && word.length > 2) {
            suggestions.add(word)
          }
        })
      })

      // Search in courses
      const { data: courses } = await supabase
        .from('courses')
        .select('title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)
      
      courses?.forEach(course => {
        if (course.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(course.title)
        }
        if (course.description?.toLowerCase().includes(query.toLowerCase())) {
          const words = course.description.toLowerCase().split(/\s+/)
          words.forEach(word => {
            if (word.includes(query.toLowerCase()) && word.length > 2) {
              suggestions.add(word)
            }
          })
        }
      })

      // Search in profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name')
        .or(`display_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5)
      
      profiles?.forEach(profile => {
        if (profile.display_name?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(profile.display_name)
        }
        if (profile.first_name?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(profile.first_name)
        }
        if (profile.last_name?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(profile.last_name)
        }
      })

      setSearchSuggestions(Array.from(suggestions).slice(0, 8))
    } catch (error) {
      console.error('Error fetching search suggestions:', error)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(true)
    fetchSearchSuggestions(value)
  }

  const handleSearchSubmit = (query: string) => {
    setShowSuggestions(false)
    setSearchQuery(query)
    // Here you would implement the actual search functionality
    console.log('Searching for:', query)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sidebar toggle for iPad/tablet */}
          {isMobile && onMenuClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onMenuClick}
              className="h-9 w-9 mr-2"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}
          
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

        {/* Search Bar - Desktop only */}
        <div className="hidden md:flex flex-1 max-w-lg mx-2 sm:mx-3 xl:mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts, courses, members..."
              className="pl-10 bg-muted/50 border-none focus:bg-background text-sm h-9 w-full"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(searchQuery)
                }
              }}
            />
            
            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                    onClick={() => handleSearchSubmit(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Search Button */}
        <div className="md:hidden flex-1 flex justify-end pr-4">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <ThemeToggle />
          
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