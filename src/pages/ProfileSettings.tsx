import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminSettings } from '@/components/dashboard/admin-settings'
import { AccountabilityDirectory } from '@/components/dashboard/accountability-directory'
import { AffiliateProgram } from '@/components/dashboard/affiliate-program'
import { FeedbackManagement } from '@/components/dashboard/feedback-management'
import { AccountSettings } from '@/components/dashboard/account-settings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, Crown, Heart, Users, ArrowLeft, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

export function ProfileSettings() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const handleBackToDashboard = () => {
    navigate('/')
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-4 space-y-4 md:space-y-6">
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
          {profile?.is_admin && (
            <Badge variant="destructive" className="text-xs">
              <Crown className="h-3 w-3 mr-1" />
              {isMobile ? "Admin" : "Admin"}
            </Badge>
          )}
          {profile?.is_accountability_partner && (
            <Badge variant="secondary" className="text-xs">
              <Heart className="h-3 w-3 mr-1" />
              {isMobile ? "Partner" : "Accountability Partner"}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="directory" className="space-y-4 md:space-y-6">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 h-auto' : 'grid-cols-5'}`}>
          <TabsTrigger 
            value="directory" 
            className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className={isMobile ? "text-center leading-tight" : ""}>
              {isMobile ? "Directory" : "Accountability Directory"}
            </span>
          </TabsTrigger>
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
          <TabsTrigger 
            value="feedback" 
            className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
          >
            <Heart className="h-4 w-4 shrink-0" />
            <span className={isMobile ? "text-center leading-tight" : ""}>Feedback</span>
          </TabsTrigger>
          <TabsTrigger 
            value="admin" 
            className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-2 text-xs' : 'text-sm'}`}
          >
            <Crown className="h-4 w-4 shrink-0" />
            <span className={isMobile ? "text-center leading-tight" : ""}>
              {isMobile ? "Admin" : "Admin Panel"}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <AccountabilityDirectory />
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="affiliate">
          <AffiliateProgram />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackManagement />
        </TabsContent>

        <TabsContent value="admin">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfileSettings