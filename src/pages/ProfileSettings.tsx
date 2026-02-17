import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AffiliateProgram } from '@/components/dashboard/affiliate-program'
import { AccountSettings } from '@/components/dashboard/account-settings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, ArrowLeft, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'

export function ProfileSettings() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-16 md:pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "icon"} 
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold truncate">Profile Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
              Manage your account and affiliate settings
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account" className="flex items-center gap-1 md:gap-2 text-sm">
            <User className="h-4 w-4 shrink-0" />
            {isMobile ? "Account" : "Account Settings"}
          </TabsTrigger>
          <TabsTrigger value="affiliate" className="flex items-center gap-1 md:gap-2 text-sm">
            <Settings className="h-4 w-4 shrink-0" />
            {isMobile ? "Affiliate" : "Affiliate Program"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="affiliate">
          <AffiliateProgram />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfileSettings