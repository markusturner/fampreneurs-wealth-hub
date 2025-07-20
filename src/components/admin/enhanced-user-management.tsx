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

export function EnhancedUserManagement({ users, coaches, onUsersUpdated }: EnhancedUserManagementProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, string[]>>({})

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
    fetchUserPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name')

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
    }
  }

  const fetchUserPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('user_programs')
        .select('user_id, program_id')

      if (error) throw error
      
      const userProgramsMap: Record<string, string[]> = {}
      data?.forEach(({ user_id, program_id }) => {
        if (!userProgramsMap[user_id]) {
          userProgramsMap[user_id] = []
        }
        userProgramsMap[user_id].push(program_id)
      })
      
      setSelectedPrograms(userProgramsMap)
    } catch (error) {
      console.error('Error fetching user programs:', error)
    }
  }

  const updateUserPrograms = async (userId: string, programIds: string[]) => {
    try {
      // Remove existing assignments
      await supabase
        .from('user_programs')
        .delete()
        .eq('user_id', userId)

      // Add new assignments
      if (programIds.length > 0) {
        const insertData = programIds.map(programId => ({
          user_id: userId,
          program_id: programId
        }))

        const { error } = await supabase
          .from('user_programs')
          .insert(insertData)

        if (error) throw error
      }

      setSelectedPrograms(prev => ({
        ...prev,
        [userId]: programIds
      }))

      toast({
        title: "Programs Updated",
        description: "User programs have been successfully updated.",
      })
    } catch (error) {
      console.error('Error updating user programs:', error)
      toast({
        title: "Error",
        description: "Failed to update user programs.",
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

  const getDisplayName = (user: Profile) => {
    return user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous'
  }

  const getProgramNames = (userId: string) => {
    const userProgramIds = selectedPrograms[userId] || []
    return programs
      .filter(program => userProgramIds.includes(program.id))
      .map(program => program.name)
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
                                <Label
                                  htmlFor={`${user.id}-${program.id}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {program.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
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
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(null)
                              fetchUserPrograms() // Reset changes
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
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUser(user.id)}
                        className="w-full"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Programs
                      </Button>
                    )}
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