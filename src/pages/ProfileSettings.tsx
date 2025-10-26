import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'


import { AffiliateProgram } from '@/components/dashboard/affiliate-program'
import { AccountSettings } from '@/components/dashboard/account-settings'
import { AdminUserManagement } from '@/components/dashboard/admin-user-management'
import { AdminMassNotification } from '@/components/dashboard/admin-mass-notification'
import { AdminAllUsersManagement } from '@/components/dashboard/admin-all-users-management'
import { ZapierIntegration } from '@/components/dashboard/zapier-integration'
import { AdminTutorialVideoManager } from '@/components/dashboard/admin-tutorial-video-manager'
import { AdminAnalyticsRevenue } from '@/components/dashboard/admin-analytics-revenue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, Heart, ArrowLeft, User, Shield, Zap, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOwnerRole } from '@/hooks/useOwnerRole'

export function ProfileSettings() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isAdmin = profile?.is_admin && user?.email === 'markusturner94@gmail.com'
  const { isOwner } = useOwnerRole(user?.id || null)

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-16 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "icon"} 
            onClick={handleBackToDashboard}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold truncate">Profile Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
              Manage your roles and community settings
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 shrink-0">
          {profile && (
            <Badge variant="secondary" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {profile.display_name || profile.first_name || 'User'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="account" className="space-y-4 md:space-y-6">
        <TabsList className={`grid w-full ${isMobile ? (isAdmin ? 'grid-cols-5 h-auto' : isOwner ? 'grid-cols-4 h-auto' : 'grid-cols-2 h-auto') : (isAdmin ? 'grid-cols-5' : isOwner ? 'grid-cols-4' : 'grid-cols-2')}`}>
          <TabsTrigger 
            value="account" 
            className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className={isMobile ? "text-center leading-tight" : ""}>
              {isMobile ? "Account" : "Account Settings"}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="affiliate" 
            className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={isMobile ? "text-center leading-tight" : ""}>
              {isMobile ? "Affiliate" : "Affiliate Program"}
            </span>
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger 
              value="zapier" 
              className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span className={isMobile ? "text-center leading-tight" : ""}>
                {isMobile ? "Zapier" : "Zapier Integration"}
              </span>
            </TabsTrigger>
          )}
          {(isAdmin || isOwner) && (
            <TabsTrigger 
              value="tutorial" 
              className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
            >
              <Video className="h-4 w-4 shrink-0" />
              <span className={isMobile ? "text-center leading-tight" : ""}>
                {isMobile ? "Tutorial" : "Tutorial Video"}
              </span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger 
              value="admin" 
              className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className={isMobile ? "text-center leading-tight" : ""}>
                {isMobile ? "Admin" : "Admin Panel"}
              </span>
            </TabsTrigger>
          )}
        </TabsList>


        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="affiliate">
          <AffiliateProgram />
        </TabsContent>

        {isOwner && user?.id && (
          <TabsContent value="zapier">
            <ZapierIntegration userId={user.id} />
          </TabsContent>
        )}

        {(isAdmin || isOwner) && (
          <TabsContent value="tutorial">
            <AdminTutorialVideoManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <AdminAnalyticsRevenue />
            <AdminAllUsersManagement />
            <AdminUserManagement />
            <AdminMassNotification />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default ProfileSettings