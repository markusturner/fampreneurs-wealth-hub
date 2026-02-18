import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminUserManagement } from '@/components/dashboard/admin-user-management'
import { AdminMassNotification } from '@/components/dashboard/admin-mass-notification'
import { AdminAllUsersManagement } from '@/components/dashboard/admin-all-users-management'
import { ZapierIntegration } from '@/components/dashboard/zapier-integration'
import { AdminTutorialVideoManager, AdminUpgradeVideoManager } from '@/components/dashboard/admin-tutorial-video-manager'
import { AdminAnalyticsOverview } from '@/components/dashboard/admin-analytics-overview'
import { AdminGrowthCharts } from '@/components/dashboard/admin-growth-charts'
import { AdminActivityHeatmap } from '@/components/dashboard/admin-activity-heatmap'
import { RolePermissionsManager } from '@/components/dashboard/role-permissions-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Zap, Video, BarChart3, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { useUserRole } from '@/hooks/useUserRole'

export function AdminSettings() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id || null)

  if (!isAdmin && !isOwner) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size={isMobile ? "sm" : "icon"} onClick={() => navigate('/dashboard')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold truncate">Admin Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">Manage admin tools and configurations</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      </div>

  <Tabs defaultValue={isOwner ? "zapier" : (isAdmin ? "admin" : "metrics")} className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0 h-auto">
            {isOwner && (
              <TabsTrigger value="zapier" className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-3 text-xs' : 'text-sm'}`}>
                <Zap className="h-4 w-4 shrink-0" />
                {isMobile ? "Zapier" : "Zapier Integration"}
              </TabsTrigger>
            )}
            {(isAdmin || isOwner) && (
              <TabsTrigger value="tutorial" className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-3 text-xs' : 'text-sm'}`}>
                <Video className="h-4 w-4 shrink-0" />
                {isMobile ? "Tutorial" : "Tutorial Video"}
              </TabsTrigger>
            )}
            {(isAdmin || isOwner) && (
              <TabsTrigger value="metrics" className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-3 text-xs' : 'text-sm'}`}>
                <BarChart3 className="h-4 w-4 shrink-0" />
                Metrics
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="permissions" className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-3 text-xs' : 'text-sm'}`}>
                <Lock className="h-4 w-4 shrink-0" />
                {isMobile ? "Roles" : "Role Permissions"}
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="admin" className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'flex-col py-3 px-3 text-xs' : 'text-sm'}`}>
                <Shield className="h-4 w-4 shrink-0" />
                {isMobile ? "Admin" : "Admin Panel"}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {isOwner && user?.id && (
          <TabsContent value="zapier"><ZapierIntegration userId={user.id} /></TabsContent>
        )}
        {(isAdmin || isOwner) && (
          <TabsContent value="tutorial" className="space-y-6">
            <AdminTutorialVideoManager />
            <AdminUpgradeVideoManager />
          </TabsContent>
        )}
        {(isAdmin || isOwner) && (
          <TabsContent value="metrics" className="space-y-6">
            <AdminAnalyticsOverview />
            <AdminGrowthCharts />
            <AdminActivityHeatmap />
          </TabsContent>
        )}
        {isOwner && (
          <TabsContent value="permissions"><RolePermissionsManager /></TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <AdminAllUsersManagement />
            <AdminUserManagement />
            <AdminMassNotification />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default AdminSettings
