import { Bell, Menu, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"
import fampreneur_logo from "@/assets/fampreneur-logo.png"

interface NavHeaderProps {
  onMenuClick?: () => void
}

export function NavHeader({ onMenuClick }: NavHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-soft">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <h1 className="text-xl font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>THE FAMPRENEUR</h1>
              <p className="text-xs text-muted-foreground">BUILDING STRONG LEGACIES</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-oswald font-bold tracking-wide" style={{color: '#ffb500'}}>THE FAMPRENEUR</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search investments, documents, team..."
              className="pl-10 bg-muted/50 border-none focus:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-secondary-foreground">3</span>
            </span>
          </Button>

          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}