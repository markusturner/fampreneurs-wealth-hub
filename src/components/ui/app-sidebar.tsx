import { useState } from "react"
import { Home, TrendingUp, FileText, Calculator, BookOpen, Users, HelpCircle, Share, UserPlus, Settings } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"

const mainItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Income Statement", url: "/income", icon: TrendingUp },
  { title: "Balance Sheet", url: "/balance", icon: Calculator },
  { title: "Tax Center", url: "/tax", icon: FileText },
  { title: "My Books", url: "/documents", icon: BookOpen },
]

const secondaryItems = [
  { title: "Refer a Friend", url: "/refer", icon: UserPlus },
  { title: "Additional Services", url: "/services", icon: Settings },
  { title: "Share Feedback", url: "/feedback", icon: Share },
  { title: "Help Center", url: "/help", icon: HelpCircle },
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
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  }

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-64"}
      collapsible="offcanvas"
    >
      <SidebarContent className="bg-background border-r">
        {/* Logo/Company Section */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            {state !== "collapsed" && (
              <span className="font-semibold text-foreground">FamilyOffice</span>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => getNavClass(item.url)}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                      {item.title === "Tax Center" && state !== "collapsed" && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          New
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation */}
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        className={({ isActive }) => getNavClass(item.url)}
                      >
                        <item.icon className="h-4 w-4 mr-3" />
                        {state !== "collapsed" && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User Profile Section */}
          {state !== "collapsed" && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {profile?.first_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.display_name || profile?.first_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Family Office
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar trigger */}
        <SidebarTrigger className="absolute top-4 right-4" />
      </SidebarContent>
    </Sidebar>
  )
}