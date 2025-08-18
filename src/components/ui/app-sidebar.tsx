import { Home, TrendingUp, FileText, Calendar } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useUserRole } from "@/hooks/useUserRole"

// Navigation items for family office members (full access)
const familyOfficeItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "The Family Roundtable", url: "/documents", icon: FileText },
  { title: "Portfolio Overview", url: "/investments", icon: TrendingUp },
]

// Navigation items for family members (limited access)
const familyMemberItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "The Family Roundtable", url: "/documents", icon: FileText },
  { title: "Calendar", url: "/calendar", icon: Calendar },
]


export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { profile } = useAuth()
  const { isFamilyOfficeOnly } = useUserRole()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary text-primary-foreground font-medium rounded-md" 
      : "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
  }

  // Choose navigation items based on user role
  const navigationItems = isFamilyOfficeOnly ? familyMemberItems : familyOfficeItems

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-64"}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarContent className="gap-0">
        <SidebarGroup className="px-0">
          <SidebarGroupLabel className={`px-4 py-2 text-sm font-semibold tracking-tight ${state === "collapsed" ? "hidden" : ""}`}>
            TruHeirs
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="gap-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClass(item.url)} w-full justify-start px-3 py-2 h-10`}
                    >
                      <item.icon className={`h-4 w-4 ${state === "collapsed" ? "" : "mr-3"}`} />
                      {state !== "collapsed" && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}