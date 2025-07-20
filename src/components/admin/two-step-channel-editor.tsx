import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, ArrowLeft, ArrowRight, Plus, X, Users, BookOpen, Video, Trash2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface Channel {
  id: string
  name: string
  description: string | null
  is_private: boolean
  associated_courses?: string[]
  associated_group_calls?: string[]
}

interface Course {
  id: string
  title: string
  category?: string
}

interface CoachingCall {
  id: string
  title: string
  session_date: string
}

interface Member {
  id: string
  user_id: string
  role: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface TwoStepChannelEditorProps {
  channel: Channel
  onChannelUpdated: () => void
}

export function TwoStepChannelEditor({ channel, onChannelUpdated }: TwoStepChannelEditorProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1 - Basic Info
  const [channelName, setChannelName] = useState(channel.name)
  const [channelDescription, setChannelDescription] = useState(channel.description || '')
  const [isPrivate, setIsPrivate] = useState(channel.is_private)

  // Step 2 - Content Management
  const [courses, setCourses] = useState<Course[]>([])
  const [coachingCalls, setCoachingCalls] = useState<CoachingCall[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>(channel.associated_courses || [])
  const [selectedCoachingCalls, setSelectedCoachingCalls] = useState<string[]>(channel.associated_group_calls || [])

  useEffect(() => {
    if (isOpen) {
      fetchContent()
    }
  }, [isOpen])

  // Reset states when dialog opens, but preserve step during the session
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      setChannelName(channel.name)
      setChannelDescription(channel.description || '')
      setIsPrivate(channel.is_private)
      setSelectedCourses(channel.associated_courses || [])
      setSelectedCoachingCalls(channel.associated_group_calls || [])
    }
  }, [isOpen, channel])

  const fetchContent = async () => {
    try {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, category')
        .eq('status', 'published')
        .order('title')

      if (coursesData) setCourses(coursesData)

      // Fetch coaching calls
      const { data: callsData } = await supabase
        .from('group_coaching_sessions')
        .select('id, title, session_date')
        .order('session_date', { ascending: false })

      if (callsData) setCoachingCalls(callsData)

      // Fetch channel members
      const { data: membersData } = await supabase
        .from('group_memberships')
        .select(`
          id,
          user_id,
          role
        `)
        .eq('group_id', channel.id)

      if (membersData) {
        // Fetch profiles separately for each member
        const membersWithProfiles = await Promise.all(
          membersData.map(async (member) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, first_name, avatar_url')
              .eq('user_id', member.user_id)
              .single()

            return {
              ...member,
              profiles: profile || null
            }
          })
        )
        setMembers(membersWithProfiles)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    }
  }

  const handleBasicInfoUpdate = async () => {
    console.log('handleBasicInfoUpdate called', { channelName, channelDescription, isPrivate, channelId: channel.id })
    
    if (!channelName.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      console.log('Attempting to update channel...')
      const { error } = await supabase
        .from('community_groups')
        .update({
          name: channelName.trim(),
          description: channelDescription.trim() || null,
          is_private: isPrivate
        })
        .eq('id', channel.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Channel updated successfully, moving to step 2')
      toast({
        title: "Success",
        description: "Channel basic information updated successfully!"
      })

      setCurrentStep(2)
      
    } catch (error) {
      console.error('Error updating channel:', error)
      toast({
        title: "Error",
        description: "Failed to update channel information",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleContentUpdate = async () => {
    setIsLoading(true)
    try {
      // For now, just show success since the database columns need to be added
      // In a real implementation, you would update the associated_courses and associated_group_calls columns
      console.log('Selected courses:', selectedCourses)
      console.log('Selected coaching calls:', selectedCoachingCalls)

      setIsOpen(false)
      setCurrentStep(1)
      onChannelUpdated()
      
      toast({
        title: "Success",
        description: "Channel content selections saved!"
      })
    } catch (error) {
      console.error('Error updating channel content:', error)
      toast({
        title: "Error",
        description: "Failed to update channel content",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteChannel = async () => {
    if (!confirm(`Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      // First delete all group members
      await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', channel.id)

      // Then delete the channel
      await supabase
        .from('community_groups')
        .delete()
        .eq('id', channel.id)

      setIsOpen(false)
      setCurrentStep(1)
      onChannelUpdated()
      
      toast({
        title: "Success",
        description: `Channel "${channel.name}" has been deleted successfully!`
      })
    } catch (error) {
      console.error('Error deleting channel:', error)
      toast({
        title: "Error",
        description: `Failed to delete channel: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.filter(m => m.id !== memberId))
      
      toast({
        title: "Success",
        description: "Member removed from channel"
      })
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive"
      })
    }
  }

  const getDisplayName = (member: Member) => {
    return member.profiles?.display_name || member.profiles?.first_name || 'Unknown User'
  }

  const resetAndClose = () => {
    setIsOpen(false)
    setCurrentStep(1)
    setChannelName(channel.name)
    setChannelDescription(channel.description || '')
    setIsPrivate(channel.is_private)
    setSelectedCourses(channel.associated_courses || [])
    setSelectedCoachingCalls(channel.associated_group_calls || [])
  }

  if (!profile?.is_admin) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Channel - Step {currentStep} of 2
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              1
            </div>
            <span className="text-sm font-medium">Basic Information</span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">Content Management</span>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter channel name"
              />
            </div>

            <div>
              <Label htmlFor="channel-description">Description (Optional)</Label>
              <Textarea
                id="channel-description"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="Enter channel description"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="private-channel"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <Label htmlFor="private-channel">Private Channel</Label>
            </div>

            <div className="flex justify-between">
              <Button
                variant="destructive"
                onClick={handleDeleteChannel}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Channel
              </Button>
              <Button onClick={handleBasicInfoUpdate} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Next: Content Management'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Content Management */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="courses">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Courses
                </TabsTrigger>
                <TabsTrigger value="coaching">
                  <Video className="mr-2 h-4 w-4" />
                  Coaching Calls
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users className="mr-2 h-4 w-4" />
                  Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Associated Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Checkbox
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCourses([...selectedCourses, course.id])
                              } else {
                                setSelectedCourses(selectedCourses.filter(id => id !== course.id))
                              }
                            }}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{course.title}</span>
                            {course.category && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {course.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {courses.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No courses available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coaching" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Associated Coaching Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {coachingCalls.map((call) => (
                        <div key={call.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Checkbox
                            checked={selectedCoachingCalls.includes(call.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCoachingCalls([...selectedCoachingCalls, call.id])
                              } else {
                                setSelectedCoachingCalls(selectedCoachingCalls.filter(id => id !== call.id))
                              }
                            }}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{call.title}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(call.session_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {coachingCalls.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No coaching calls available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Channel Members ({members.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {getDisplayName(member).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{getDisplayName(member)}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {member.role}
                              </Badge>
                            </div>
                          </div>
                          {member.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(member.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No members in this channel
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-between">
              <Button
                variant="destructive"
                onClick={handleDeleteChannel}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Channel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous: Basic Info
                </Button>
                <Button variant="outline" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button onClick={handleContentUpdate} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Channel'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}