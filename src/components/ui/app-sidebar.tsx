import { useState } from "react"
import { Home, TrendingUp, FileText, Shield, Calculator, Heart, Users, UserCheck, Scale } from "lucide-react"
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
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Investments", url: "/investments", icon: TrendingUp },
  { title: "Documents", url: "/documents", icon: FileText },
]

const planningItems = [
  { title: "Estate Planning", url: "/estate-planning", icon: Scale },
  { title: "Tax Planning", url: "/tax-planning", icon: Calculator },
  { title: "Risk Management", url: "/risk-management", icon: Shield },
]

const managementItems = [
  { title: "Philanthropy", url: "/philanthropy", icon: Heart },
  { title: "Family Governance", url: "/family-governance", icon: Users },
  { title: "Professional Services", url: "/professional-services", icon: UserCheck },
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
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Planning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planningItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
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