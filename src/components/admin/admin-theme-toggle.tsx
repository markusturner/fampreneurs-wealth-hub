import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function AdminThemeToggle() {
  const { setTheme, theme } = useTheme()
  const isDark = theme === 'dark'
  const glowColor = isDark ? '#ffb500' : '#290a52'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" style={{ color: '#ffb500', filter: `drop-shadow(0 0 8px ${glowColor}CC)` }} />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" style={{ filter: `drop-shadow(0 0 8px ${glowColor}99)` }} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border border-border shadow-medium">
        <DropdownMenuItem onClick={() => setTheme("light")} className="hover:bg-accent">
          <Sun className="h-4 w-4 mr-2" style={{ color: '#ffb500', filter: `drop-shadow(0 0 6px ${glowColor}CC)` }} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="hover:bg-accent">
          <Moon className="h-4 w-4 mr-2" style={{ filter: `drop-shadow(0 0 6px ${glowColor}CC)` }} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="hover:bg-accent">
          <Monitor className="h-4 w-4 mr-2" style={{ color: '#ffb500', filter: `drop-shadow(0 0 6px ${glowColor}CC)` }} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}