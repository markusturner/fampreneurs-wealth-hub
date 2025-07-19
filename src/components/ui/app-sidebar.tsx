import { useState } from "react"
import { Home, Users, Calendar, BookOpen, MessageSquare, Crown } from "lucide-react"
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

const mainItems = [
  { title: "Family Office", url: "/", icon: Home },
  { title: "Community", url: "/community", icon: MessageSquare },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Calendar", url: "/coaching", icon: Calendar },
  { title: "Scoreboard", url: "/members", icon: Users },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { profile } = useAuth()
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

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-60"}
      collapsible="offcanvas"
    >
      {/* Sidebar trigger */}
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin Dashboard - only show for admins */}
              {profile?.is_admin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={getNavClass("/admin")}>
                      <Crown className="h-4 w-4" />
                      {state !== "collapsed" && <span>Admin Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}