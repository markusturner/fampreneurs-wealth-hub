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
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-muted/50"
  }

  // Choose navigation items based on user role
  const navigationItems = isFamilyOfficeOnly ? familyMemberItems : familyOfficeItems

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-60"}
      collapsible="offcanvas"
    >
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
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