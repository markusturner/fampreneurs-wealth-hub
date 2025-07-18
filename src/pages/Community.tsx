import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { GroupSidebar } from '@/components/community/group-sidebar'
import { GroupChat } from '@/components/community/group-chat'
import { SubscriptionBanner } from '@/components/community/subscription-banner'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'

const Community = () => {
  const { user, profile, loading } = useAuth()
  const { subscriptionStatus, createCheckout } = useSubscription()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)

  // Check for subscription success/cancel in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const subscription = urlParams.get('subscription')
    
    if (subscription === 'success') {
      // Clear the URL params and refresh subscription status
      window.history.replaceState({}, '', '/community')
      // The subscription hook will automatically refresh
    }
  }, [])

  // Fetch group details when selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId)
    } else {
      setSelectedGroup(null)
    }
  }, [selectedGroupId])

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (error) throw error
      setSelectedGroup(data)
    } catch (error) {
      console.error('Error fetching group details:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading community...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Mobile: Hide sidebar when chat is open */}
        <div className={`${sidebarOpen ? 'fixed inset-0 z-50 bg-background md:relative md:z-auto' : 'hidden md:block'}`}>
          <GroupSidebar 
            selectedGroupId={selectedGroupId}
            onGroupSelect={(groupId) => {
              setSelectedGroupId(groupId)
              // Close mobile sidebar when group is selected
              if (window.innerWidth < 768) {
                setSidebarOpen(false)
              }
            }}
          />
        </div>
        
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Show subscription banner */}
          <div className="p-2 sm:p-4">
            <SubscriptionBanner 
              isPremiumGroup={selectedGroup?.is_premium}
              onUpgrade={createCheckout}
            />
          </div>
          
          {/* Chat Area */}
          <div className="flex-1 min-h-0">
            {selectedGroupId ? (
              // Only show group content if user has access
              (selectedGroup?.is_premium && !subscriptionStatus.subscribed) ? (
                <div className="flex items-center justify-center h-full p-4">
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                      This premium group content is only available to subscribers.
                    </p>
                  </div>
                </div>
              ) : (
                <GroupChat groupId={selectedGroupId} />
              )
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Welcome to Family Community</h3>
                  <p className="text-sm text-muted-foreground mb-4">Select a group to start chatting</p>
                  <Button 
                    variant="outline" 
                    className="md:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    Browse Groups
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Community