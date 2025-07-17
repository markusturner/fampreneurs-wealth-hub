import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminSettings } from '@/components/dashboard/admin-settings'
import { AccountabilityDirectory } from '@/components/dashboard/accountability-directory'
import { AffiliateProgram } from '@/components/dashboard/affiliate-program'
import { Badge } from '@/components/ui/badge'
import { Settings, Crown, Heart, Users } from 'lucide-react'

export function ProfileSettings() {
  const { profile } = useAuth()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your roles and community settings
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.is_admin && (
            <Badge variant="destructive">
              <Crown className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
          {profile?.is_accountability_partner && (
            <Badge variant="secondary">
              <Heart className="h-3 w-3 mr-1" />
              Accountability Partner
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Accountability Directory
          </TabsTrigger>
          <TabsTrigger value="affiliate" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Affiliate Program
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Admin Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <AccountabilityDirectory />
        </TabsContent>

        <TabsContent value="affiliate">
          <AffiliateProgram />
        </TabsContent>

        <TabsContent value="admin">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfileSettings