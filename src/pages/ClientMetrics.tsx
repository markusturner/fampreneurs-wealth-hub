import { useAuth } from '@/contexts/AuthContext'
import { AdminAnalyticsOverview } from '@/components/dashboard/admin-analytics-overview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { useUserRole } from '@/hooks/useUserRole'

export function ClientMetrics() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isAdmin, isLoading: adminLoading } = useUserRole()
  const { isOwner, isLoading: ownerLoading } = useOwnerRole(user?.id || null)

  const rolesLoading = adminLoading || ownerLoading
  const allowed = isAdmin || isOwner


  return (
    <div className="mx-auto py-3 md:py-6 px-3 sm:px-6 lg:px-8 space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-[1800px]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size={isMobile ? 'sm' : 'icon'} onClick={() => navigate('/welcome')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold truncate">Client Metrics</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">Revenue, growth, and client success performance</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          <BarChart3 className="h-3 w-3 mr-1" />
          Metrics
        </Badge>
      </div>

      <AdminAnalyticsOverview />
    </div>
  )
}

export default ClientMetrics
