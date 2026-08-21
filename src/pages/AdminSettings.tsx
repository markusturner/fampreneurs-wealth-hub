import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminUserManagement } from '@/components/dashboard/admin-user-management'
import { AdminMassNotification } from '@/components/dashboard/admin-mass-notification'
import { AdminPushTest } from '@/components/dashboard/admin-push-test'
import { AdminAllUsersManagement } from '@/components/dashboard/admin-all-users-management'
import { ZapierIntegration } from '@/components/dashboard/zapier-integration'
import { ApiKeyManager } from '@/components/dashboard/api-key-manager'
import { AdminTutorialVideoManager, AdminUpgradeVideoManager, AdminVideoManager } from '@/components/dashboard/admin-tutorial-video-manager'

import { RolePermissionsManager } from '@/components/dashboard/role-permissions-manager'
import { CommunityManagerAdmin } from '@/components/dashboard/community-manager-admin'
import { AdminInviteLinks } from '@/components/dashboard/admin-invite-links'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Zap, Video, Lock, Loader2, MessageCircle, Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { useUserRole } from '@/hooks/useUserRole'

export function AdminSettings() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isAdmin, isLoading: useUserRoleLoading } = useUserRole()
  const { isOwner, isLoading: useOwnerRoleLoading } = useOwnerRole(user?.id || null)

  // Show loading state while role is being determined
  if (useOwnerRoleLoading || useUserRoleLoading) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading admin settings...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin && !isOwner) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto py-3 md:py-6 px-3 sm:px-6 lg:px-8 space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-[1800px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size={isMobile ? "sm" : "icon"} onClick={() => navigate('/welcome')} className="shrink-0">
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

      <Tabs defaultValue={isAdmin ? "users" : "content"} className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0 h-auto gap-1 p-1 rounded-xl bg-muted/60">
            {isAdmin && (
              <TabsTrigger value="users" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <Shield className="h-4 w-4 shrink-0" />
                Users
              </TabsTrigger>
            )}
            {(isAdmin || isOwner) && (
              <TabsTrigger value="invites" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <Link2 className="h-4 w-4 shrink-0" />
                Invites
              </TabsTrigger>
            )}
            {(isAdmin || isOwner) && (
              <TabsTrigger value="community" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <MessageCircle className="h-4 w-4 shrink-0" />
                Community
              </TabsTrigger>
            )}
            {(isAdmin || isOwner) && (
              <TabsTrigger value="content" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <Video className="h-4 w-4 shrink-0" />
                Content
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="integrations" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <Zap className="h-4 w-4 shrink-0" />
                Integrations
              </TabsTrigger>
            )}
            {isOwner && (
              <TabsTrigger value="permissions" className={`flex items-center gap-2 rounded-lg ${isMobile ? 'flex-col py-2.5 px-3 text-xs' : 'text-sm px-4 py-2'}`}>
                <Lock className="h-4 w-4 shrink-0" />
                Roles
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <AdminAllUsersManagement />
          </TabsContent>
        )}

        {(isAdmin || isOwner) && (
          <TabsContent value="invites" className="space-y-6">
            <AdminUserManagement />
            <AdminInviteLinks />
          </TabsContent>
        )}

        {(isAdmin || isOwner) && (
          <TabsContent value="community" className="space-y-6">
            <CommunityManagerAdmin />
            <AdminMassNotification />
            <AdminPushTest />
          </TabsContent>
        )}

        {(isAdmin || isOwner) && (
          <TabsContent value="content" className="space-y-6">
            <AdminTutorialVideoManager />
            <AdminUpgradeVideoManager />
            <AdminVideoManager
              settingKey="workspace_video_url"
              title="Workspace Tutorial Video"
              description="Tutorial video shown on the Workspace page to help users learn the workspace tools"
            />
          </TabsContent>
        )}

        {isOwner && user?.id && (
          <TabsContent value="integrations" className="space-y-6">
            <ZapierIntegration userId={user.id} />
            <ApiKeyManager userId={user.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="permissions"><RolePermissionsManager /></TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default AdminSettings
