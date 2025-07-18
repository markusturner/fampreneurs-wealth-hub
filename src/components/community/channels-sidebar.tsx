import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Hash, Lock, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Channel {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string
  member_count?: number
}

interface ChannelsSidebarProps {
  selectedChannelId: string | null
  onChannelSelect: (channelId: string | null) => void
}

export const ChannelsSidebar = ({ selectedChannelId, onChannelSelect }: ChannelsSidebarProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [channels, setChannels] = useState<Channel[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDescription, setNewChannelDescription] = useState('')
  const [isPrivateChannel, setIsPrivateChannel] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get member counts for each channel
      const channelsWithCounts = await Promise.all(
        (channelsData || []).map(async (channel) => {
          const { count } = await supabase
            .from('channel_members')
            .select('*', { count: 'exact' })
            .eq('channel_id', channel.id)

          return {
            ...channel,
            member_count: count || 0
          }
        })
      )

      setChannels(channelsWithCounts)
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !user) return

    setIsCreating(true)
    try {
      const { data: channelData, error } = await supabase
        .from('channels')
        .insert({
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || null,
          created_by: user.id,
          is_private: isPrivateChannel
        })
        .select()
        .single()

      if (error) throw error

      // Auto-join the creator to the channel
      if (channelData) {
        await supabase
          .from('channel_members')
          .insert({
            channel_id: channelData.id,
            user_id: user.id,
            role: 'admin'
          })
      }

      setNewChannelName('')
      setNewChannelDescription('')
      setIsPrivateChannel(false)
      setShowCreateDialog(false)
      fetchChannels()
      
      // Set the new channel as selected to show its feed
      if (channelData) {
        onChannelSelect(channelData.id)
      }
      
      toast({
        title: "Success",
        description: "Channel created successfully!"
      })
    } catch (error) {
      console.error('Error creating channel:', error)
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinChannel = async (channelId: string) => {
    if (!user) return

    try {
      await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: user.id
        })

      toast({
        title: "Success",
        description: "Joined channel successfully!"
      })

      fetchChannels()
    } catch (error) {
      console.error('Error joining channel:', error)
      toast({
        title: "Error",
        description: "Failed to join channel",
        variant: "destructive"
      })
    }
  }

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Channels</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="channel-name">Channel Name</Label>
                  <Input
                    id="channel-name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Enter channel name"
                  />
                </div>
                <div>
                  <Label htmlFor="channel-description">Description (Optional)</Label>
                  <Input
                    id="channel-description"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="Enter channel description"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="channel-private"
                    checked={isPrivateChannel}
                    onCheckedChange={setIsPrivateChannel}
                  />
                  <Label htmlFor="channel-private">Private Channel</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateChannel}
                    disabled={isCreating || !newChannelName.trim()}
                    className="flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* All Posts option */}
        <Button
          variant={selectedChannelId === null ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChannelSelect(null)}
          className="w-full justify-start gap-2 h-8 text-xs"
        >
          <Users className="h-3 w-3" />
          All Posts
        </Button>

        {/* Channels list */}
        {channels.map((channel) => (
          <Button
            key={channel.id}
            variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onChannelSelect(channel.id)}
            className="w-full justify-start gap-2 h-8 text-xs"
          >
            {channel.is_private ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Hash className="h-3 w-3" />
            )}
            <span className="truncate flex-1 text-left">{channel.name}</span>
            <span className="text-xs text-muted-foreground">
              {channel.member_count}
            </span>
          </Button>
        ))}

        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No channels yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}