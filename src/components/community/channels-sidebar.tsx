import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Hash, Lock, Users, Edit, Calendar, BookOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface Channel {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string
  member_count?: number
  associated_group_calls?: string[]
  associated_courses?: string[]
}

interface GroupCall {
  id: string
  title: string
  session_date: string
}

interface Course {
  id: string
  title: string
  instructor: string | null
}

interface ChannelsSidebarProps {
  selectedChannelId: string | null
  onChannelSelect: (channelId: string | null) => void
}

export const ChannelsSidebar = ({ selectedChannelId, onChannelSelect }: ChannelsSidebarProps) => {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [channels, setChannels] = useState<Channel[]>([])
  const [groupCalls, setGroupCalls] = useState<GroupCall[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDescription, setNewChannelDescription] = useState('')
  const [isPrivateChannel, setIsPrivateChannel] = useState(false)
  const [selectedGroupCalls, setSelectedGroupCalls] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)


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

  const fetchGroupCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('group_coaching_sessions')
        .select('id, title, session_date')
        .order('session_date', { ascending: false })

      if (error) throw error
      setGroupCalls(data || [])
    } catch (error) {
      console.error('Error fetching group calls:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, instructor')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const resetForm = () => {
    setNewChannelName('')
    setNewChannelDescription('')
    setIsPrivateChannel(false)
    setSelectedGroupCalls([])
    setSelectedCourses([])
  }

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel)
    setNewChannelName(channel.name)
    setNewChannelDescription(channel.description || '')
    setIsPrivateChannel(channel.is_private)
    setSelectedGroupCalls(channel.associated_group_calls || [])
    setSelectedCourses(channel.associated_courses || [])
    setShowEditDialog(true)
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !user || !profile?.is_admin) {
      toast({
        title: "Error",
        description: "Only administrators can create channels",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { data: channelData, error } = await supabase
        .from('channels')
        .insert({
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || null,
          created_by: user.id,
          is_private: isPrivateChannel,
          associated_group_calls: selectedGroupCalls,
          associated_courses: selectedCourses
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

      resetForm()
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

  const handleUpdateChannel = async () => {
    if (!editingChannel || !newChannelName.trim() || !user || !profile?.is_admin) {
      toast({
        title: "Error", 
        description: "Only administrators can edit channels",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { error } = await supabase
        .from('channels')
        .update({
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || null,
          is_private: isPrivateChannel,
          associated_group_calls: selectedGroupCalls,
          associated_courses: selectedCourses
        })
        .eq('id', editingChannel.id)

      if (error) throw error

      resetForm()
      setShowEditDialog(false)
      setEditingChannel(null)
      fetchChannels()
      
      toast({
        title: "Success",
        description: "Channel updated successfully!"
      })
    } catch (error) {
      console.error('Error updating channel:', error)
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Move useEffect after all function definitions
  useEffect(() => {
    fetchChannels()
    fetchGroupCalls()
    fetchCourses()
  }, [])

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Channels</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={!profile?.is_admin}>
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
                  <Textarea
                    id="channel-description"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="Enter channel description"
                    rows={3}
                  />
                </div>
                
                {/* Group Calls Association */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Associated Group Calls
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                    {groupCalls.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No group calls available</p>
                    ) : (
                      groupCalls.map((call) => (
                        <div key={call.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`call-${call.id}`}
                            checked={selectedGroupCalls.includes(call.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGroupCalls([...selectedGroupCalls, call.id])
                              } else {
                                setSelectedGroupCalls(selectedGroupCalls.filter(id => id !== call.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`call-${call.id}`}
                            className="text-xs cursor-pointer flex-1"
                          >
                            {call.title} ({new Date(call.session_date).toLocaleDateString()})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Courses Association */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Associated Courses
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                    {courses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No courses available</p>
                    ) : (
                      courses.map((course) => (
                        <div key={course.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCourses([...selectedCourses, course.id])
                              } else {
                                setSelectedCourses(selectedCourses.filter(id => id !== course.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`course-${course.id}`}
                            className="text-xs cursor-pointer flex-1"
                          >
                            {course.title} {course.instructor && `- ${course.instructor}`}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="channel-private"
                    checked={isPrivateChannel}
                    onCheckedChange={setIsPrivateChannel}
                    style={isPrivateChannel ? { backgroundColor: '#ffb500' } : {}}
                  />
                  <Label htmlFor="channel-private" style={isPrivateChannel ? { color: '#ffb500' } : {}}>
                    Private Channel
                  </Label>
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
          
          {/* Edit Channel Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-channel-name">Channel Name</Label>
                  <Input
                    id="edit-channel-name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Enter channel name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-channel-description">Description (Optional)</Label>
                  <Textarea
                    id="edit-channel-description"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="Enter channel description"
                    rows={3}
                  />
                </div>
                
                {/* Group Calls Association */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Associated Group Calls
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                    {groupCalls.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No group calls available</p>
                    ) : (
                      groupCalls.map((call) => (
                        <div key={call.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-call-${call.id}`}
                            checked={selectedGroupCalls.includes(call.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGroupCalls([...selectedGroupCalls, call.id])
                              } else {
                                setSelectedGroupCalls(selectedGroupCalls.filter(id => id !== call.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`edit-call-${call.id}`}
                            className="text-xs cursor-pointer flex-1"
                          >
                            {call.title} ({new Date(call.session_date).toLocaleDateString()})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Courses Association */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Associated Courses
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                    {courses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No courses available</p>
                    ) : (
                      courses.map((course) => (
                        <div key={course.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-course-${course.id}`}
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCourses([...selectedCourses, course.id])
                              } else {
                                setSelectedCourses(selectedCourses.filter(id => id !== course.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`edit-course-${course.id}`}
                            className="text-xs cursor-pointer flex-1"
                          >
                            {course.title} {course.instructor && `- ${course.instructor}`}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-channel-private"
                    checked={isPrivateChannel}
                    onCheckedChange={setIsPrivateChannel}
                    style={isPrivateChannel ? { backgroundColor: '#ffb500' } : {}}
                  />
                  <Label htmlFor="edit-channel-private" style={isPrivateChannel ? { color: '#ffb500' } : {}}>Private Channel</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateChannel}
                    disabled={isCreating || !newChannelName.trim()}
                    className="flex-1"
                  >
                    {isCreating ? 'Updating...' : 'Update'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false)
                      resetForm()
                      setEditingChannel(null)
                    }}
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
          <div key={channel.id} className="flex items-center gap-1">
            <Button
              variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onChannelSelect(channel.id)}
              className="flex-1 justify-start gap-2 h-8 text-xs"
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
            {(channel.created_by === user?.id || profile?.is_admin) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => handleEditChannel(channel)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
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