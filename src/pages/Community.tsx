import { NavHeader } from '@/components/dashboard/nav-header'
import { CommunityFeed } from '@/components/community/community-feed'
import { ChatWidget } from '@/components/community/chat-widget'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Menu, Loader2, Hash, ArrowLeft } from 'lucide-react'



import { VideoCallButton } from '@/components/video-call/VideoCallButton'
import { VideoCallBanner } from '@/components/video-call/VideoCallBanner'

const Community = () => {
  const { user, profile, loading } = useAuth()
  const { subscriptionStatus, createCheckout } = useSubscription()
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showChannels, setShowChannels] = useState(false)
  

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

  const fetchChannels = async () => {
    try {
      // Use community_groups instead of channels
      const { data, error } = await supabase
        .from('community_groups')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setChannels(data || [])
    } catch (error) {
      console.error('Error fetching community groups:', error)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

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
    <div className="min-h-screen flex w-full flex-col">
      <NavHeader />

      {/* Video Call Banner */}
      <VideoCallBanner />
      
      <main className="w-full animate-fade-in">
        {/* Mobile Channel Navigation */}
        <div className="block lg:hidden px-3 sm:px-4">
          {showChannels ? (
            <div className="py-4 sm:py-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChannels(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Feed</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  Community Groups
                </h1>
                <div></div>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
                <Button
                  variant={selectedChannelId === null ? "default" : "ghost"}
                  className="w-full justify-start gap-3 text-sm"
                  onClick={() => {
                    setSelectedChannelId(null)
                    setShowChannels(false)
                  }}
                >
                  <Hash className="h-4 w-4" />
                  All Posts
                </Button>
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannelId === channel.id ? "default" : "ghost"}
                    className="w-full justify-start gap-3 text-sm"
                    onClick={() => {
                      setSelectedChannelId(channel.id)
                      setShowChannels(false)
                    }}
                  >
                    <Hash className="h-4 w-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 sm:py-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    Community Feed
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Connect with other like minded first generation wealth builders
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VideoCallButton />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChannels(true)}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <Hash className="h-4 w-4" />
                    <span className="hidden sm:inline">Channels</span>
                    <span className="sm:hidden">Groups</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block px-4 xl:px-6 py-6 border-b bg-background/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl xl:text-3xl font-bold text-foreground">
                  Community Feed
                </h1>
                <p className="text-sm xl:text-base text-muted-foreground mt-1">
                  Connect with other like minded first generation wealth builders
                </p>
              </div>
              <VideoCallButton />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pb-0 md:pb-6 overflow-x-hidden">
          {!showChannels && <CommunityFeed />}
        </div>
      </main>

      {/* Chat Widget */}
      <ChatWidget />

      {/* Mobile Bottom Navigation space */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}

export default Community