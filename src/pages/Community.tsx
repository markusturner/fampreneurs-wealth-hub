import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { CommunityFeed } from '@/components/community/community-feed'
import { ChatWidget } from '@/components/community/chat-widget'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Loader2, Hash, ArrowLeft } from 'lucide-react'

const Community = () => {
  const { user, profile, loading } = useAuth()
  const { subscriptionStatus, createCheckout } = useSubscription()
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      // Use channels table instead of community_channels
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setChannels(data || [])
    } catch (error) {
      console.error('Error fetching channels:', error)
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
    <div className="min-h-screen bg-background relative">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="w-full">
        {/* Mobile Channel Navigation */}
        <div className="block lg:hidden">
          {showChannels ? (
            <div className="px-4 py-6 border-b bg-background/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChannels(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Feed
                </Button>
                <h1 className="text-lg font-bold text-foreground">
                  Channels
                </h1>
                <div></div>
              </div>
              <div className="space-y-2">
                <Button
                  variant={selectedChannelId === null ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setSelectedChannelId(null)
                    setShowChannels(false)
                  }}
                >
                  <Hash className="h-4 w-4" />
                  General
                </Button>
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannelId === channel.id ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
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
            <div className="px-4 py-6 border-b bg-background/80 backdrop-blur-sm">
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Community Feed
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect with other like minded first generation wealth builders
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChannels(true)}
                  className="flex items-center gap-2 w-fit"
                >
                  <Hash className="h-4 w-4" />
                  Channels
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block px-4 py-6 border-b bg-background/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Community Feed
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Connect with other like minded first generation wealth builders
                </p>
              </div>
            </div>
          </div>
        </div>

        {!showChannels && <CommunityFeed />}
      </main>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  )
}

export default Community