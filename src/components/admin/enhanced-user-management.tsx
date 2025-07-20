import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Edit, Save, X, Plus, Trash2, Users, Search } from 'lucide-react'

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  email?: string
  is_admin: boolean
  created_at: string
  avatar_url: string | null
  program_name: string | null
  membership_type: string | null
  course_progress?: number
  group_calls_attended?: number
  one_on_one_calls_attended?: number
  activation_point?: string | null
  assigned_coach?: {
    id: string
    full_name: string
  } | null
}

interface Coach {
  id: string
  full_name: string
}

interface Program {
  id: string
  name: string
  description?: string
}

interface EnhancedUserManagementProps {
  users: Profile[]
  coaches: Coach[]
  onUsersUpdated: () => void
}

export function EnhancedUserManagement({ users = [], coaches = [], onUsersUpdated }: EnhancedUserManagementProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, string[]>>({})

  const activationPoints = [
    'Admin Onboarding',
    'Onboarding Call',
    'Credit Repair',
    'Credit Funding',
    'Pending Account',
    '3 Trusts Approved',
    'First Asset Funded',
    'Digital Family Office Online',
    'Schedule 1st Family Legacy Meeting',
    'Offboarded/Graduation',
    'Renewals/Upsells',
    'Lost Mentee'
  ]

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  // Reset editing state when component unmounts or when users prop changes
  useEffect(() => {
    console.log('Users prop changed, resetting state. New users:', users.length)
    setEditingUser(null)
    setSelectedPrograms({})
  }, [users])

  const fetchPrograms = async () => {
    try {
      // Mock programs since programs table doesn't exist
      const mockPrograms = [
        { id: '1', name: 'The Family Business University', description: 'Comprehensive business education' },
        { id: '2', name: 'The Family Vault', description: 'Financial management and investment' },
        { id: '3', name: 'The Family Business Accelerator', description: 'Business growth and scaling' },
        { id: '4', name: 'The Family Legacy: VIP Weekend', description: 'Legacy planning workshop' },
        { id: '5', name: 'The Family Fortune Mastermind', description: 'High-level strategic planning' }
      ]
      setPrograms(mockPrograms)
    } catch (error) {
      console.error('Error fetching programs:', error)
    }
  }

  const updateUserPrograms = async (userId: string, programIds: string[]) => {
    try {
      // Get the program name from the selected programs
      const programName = programIds.length > 0 
        ? programs.find(p => p.id === programIds[0])?.name || null
        : null

      // Update the user's program in the database
      const { error } = await supabase
        .from('profiles')
        .update({ program_name: programName })
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: "Program Updated",
        description: `User has been successfully assigned to ${programName || 'no program'}.`,
      })

      // Clear local editing state
      setEditingUser(null)
      setSelectedPrograms(prev => {
        const newState = { ...prev }
        delete newState[userId]
        return newState
      })
      
      // Refresh users data only
      onUsersUpdated()
      
    } catch (error) {
      console.error('Error updating user program:', error)
      toast({
        title: "Error",
        description: "Failed to update user program.",
        variant: "destructive",
      })
    }
  }

  const assignCoach = async (userId: string, coachId: string) => {
    try {
      // Deactivate existing assignments
      await supabase
        .from('coach_assignments')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('status', 'active')

      if (coachId !== 'none') {
        // Create new assignment
        const { error } = await supabase
          .from('coach_assignments')
          .insert({
            user_id: userId,
            coach_id: coachId,
            status: 'active'
          })

        if (error) throw error
      }

      toast({
        title: coachId === 'none' ? "Coach Unassigned" : "Coach Assigned",
        description: coachId === 'none' 
          ? "Coach has been removed from the user."
          : "Coach has been successfully assigned to the user.",
      })

      onUsersUpdated()
    } catch (error) {
      console.error('Error assigning coach:', error)
      toast({
        title: "Error",
        description: "Failed to assign coach.",
        variant: "destructive",
      })
    }
  }

  const updateActivationPoint = async (userId: string, activationPoint: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ activation_point: activationPoint } as any)
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: "Activation Point Updated",
        description: `User's activation point has been set to ${activationPoint}.`,
      })

      onUsersUpdated()
    } catch (error) {
      console.error('Error updating activation point:', error)
      toast({
        title: "Error",
        description: "Failed to update activation point.",
        variant: "destructive",
      })
    }
  }

  const getDisplayName = (user: Profile) => {
    return user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'
  }

  const getProgramNames = (userId: string) => {
    // First check if there are locally selected programs for this user
    const userProgramIds = selectedPrograms[userId] || []
    if (userProgramIds.length > 0) {
      return programs
        .filter(program => userProgramIds.includes(program.id))
        .map(program => program.name)
    }
    
    // Otherwise, show the user's actual assigned program from the database
    const user = users.find(u => u.user_id === userId)
    return user?.program_name ? [user.program_name] : []
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 sm:gap-6">
        {filteredUsers.map(user => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* User Info */}
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getDisplayName(user).split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {getDisplayName(user)}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email || 'No email'}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Progress: {user.course_progress || 0}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Group: {user.group_calls_attended || 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        1-on-1: {user.one_on_one_calls_attended || 0}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Program Assignment */}
                <div className="flex-shrink-0 min-w-0 sm:w-80">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Assigned Programs</Label>
                      <div className="mt-1">
                        {getProgramNames(user.user_id).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {getProgramNames(user.user_id).map(programName => (
                              <Badge key={programName} variant="secondary" className="text-xs">
                                {programName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No programs assigned</p>
                        )}
                      </div>
                    </div>

                    {editingUser === user.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Select Programs</Label>
                          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                            {programs.map(program => (
                              <div key={program.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${user.id}-${program.id}`}
                                  checked={(selectedPrograms[user.user_id] || []).includes(program.id)}
                                  onCheckedChange={(checked) => {
                                    const currentPrograms = selectedPrograms[user.user_id] || []
                                    const newPrograms = checked
                                      ? [...currentPrograms, program.id]
                                      : currentPrograms.filter(id => id !== program.id)
                                    
                                    setSelectedPrograms(prev => ({
                                      ...prev,
                                      [user.user_id]: newPrograms
                                    }))
                                  }}
                                />
                                 <label
                                   htmlFor={`${user.id}-${program.id}`}
                                   className="text-sm cursor-pointer flex-1"
                                 >
                                   {program.name}
                                 </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              updateUserPrograms(user.user_id, selectedPrograms[user.user_id] || [])
                              setEditingUser(null)
                            }}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(null)
                              // Reset local state without triggering full refresh
                              setSelectedPrograms(prev => {
                                const newState = { ...prev }
                                delete newState[user.user_id]
                                return newState
                              })
                            }}
                            className="flex-1"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Initialize selected programs with current assignment
                          if (user.program_name) {
                            const programId = programs.find(p => p.name === user.program_name)?.id
                            if (programId) {
                              setSelectedPrograms(prev => ({
                                ...prev,
                                [user.user_id]: [programId]
                              }))
                            }
                          }
                          setEditingUser(user.id)
                        }}
                        className="w-full"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Programs
                      </Button>
                    )}
                  </div>
                </div>

                {/* Activation Point */}
                <div className="flex-shrink-0 min-w-0 sm:w-48">
                  <div>
                    <Label className="text-sm font-medium">Activation Points</Label>
                    <Select 
                      value={user.activation_point || 'none'}
                      onValueChange={(value) => updateActivationPoint(user.user_id, value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select activation point" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Activation Point</SelectItem>
                        {activationPoints.map((point) => (
                          <SelectItem key={point} value={point}>
                            {point}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Coach Assignment */}
                <div className="flex-shrink-0 min-w-0 sm:w-48">
                  <div>
                    <Label className="text-sm font-medium">Assigned Coach</Label>
                    <Select 
                      value={user.assigned_coach?.id || 'none'}
                      onValueChange={(value) => assignCoach(user.user_id, value)}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select coach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Coach</SelectItem>
                        {coaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            {coach.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No users found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'No users have been created yet.'}
          </p>
        </div>
      )}
    </div>
  )
}