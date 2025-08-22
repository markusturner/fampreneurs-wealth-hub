import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { NavHeader } from '@/components/dashboard/nav-header'
import { AddFamilyMemberDialog } from '@/components/dashboard/add-family-member-dialog'
import { AddFamilyOfficeMemberDialog } from '@/components/dashboard/add-family-office-member-dialog'
import { EditFamilyMemberDialog } from '@/components/dashboard/edit-family-member-dialog'
import { EditFamilyOfficeMemberDialog } from '@/components/dashboard/edit-family-office-member-dialog'
import { 
  UserPlus, 
  Mail, 
  Phone, 
  User, 
  Edit, 
  Trash2, 
  Users, 
  Crown, 
  Building2, 
  Briefcase 
} from 'lucide-react'

interface FamilyMember {
  id: string
  added_by: string
  full_name: string
  family_position: string
  relationship_to_family: string | null
  email: string | null
  phone: string | null
  trust_positions: string[] | null
  status: string | null
  is_invited: boolean | null
  notes: string | null
  created_at: string
  updated_at: string | null
  joined_at: string | null
  invitation_sent_at: string | null
}

interface FamilyOfficeMember {
  id: string
  added_by: string
  full_name: string
  email: string
  phone: string | null
  role: string | null
  company: string | null
  department: string | null
  access_level: string | null
  specialties: string[] | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string | null
  joined_at: string | null
}

export default function Members() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [officeMembers, setOfficeMembers] = useState<FamilyOfficeMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFamilyDialog, setShowAddFamilyDialog] = useState(false)
  const [showAddOfficeDialog, setShowAddOfficeDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [editingOfficeMember, setEditingOfficeMember] = useState<FamilyOfficeMember | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [user?.id])

  useEffect(() => {
    // Listen for custom events when family members are added
    const handleFamilyMemberAdded = () => {
      fetchMembers()
    }

    window.addEventListener('familyMemberAdded', handleFamilyMemberAdded)
    return () => window.removeEventListener('familyMemberAdded', handleFamilyMemberAdded)
  }, [])

  const fetchMembers = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Fetch family members
      const { data: familyData, error: familyError } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .order('created_at', { ascending: false })

      if (familyError) throw familyError

      // Fetch family office members (using type casting until types are regenerated)
      const { data: officeData, error: officeError } = await supabase
        .from('family_office_members' as any)
        .select('*')
        .eq('added_by', user.id)
        .order('created_at', { ascending: false })

      if (officeError) throw officeError

      setFamilyMembers(familyData || [])
      setOfficeMembers((officeData as unknown as FamilyOfficeMember[]) || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast({
        title: "Error",
        description: "Failed to fetch members",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (member: FamilyMember) => {
    // Accepted once they actually join (joined_at recorded)
    if (member.joined_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Accepted</Badge>
    }
    // Consider as Invited if an invitation has been sent OR is_invited flag is true
    if (member.invitation_sent_at || member.is_invited) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Invited</Badge>
    }
    // Pending state from DB
    if (member.status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
    }
    // Default fallback
    return <Badge variant="outline" className="bg-gray-100 text-gray-800">Not Invited</Badge>
  }

  const handleDeleteFamilyMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setFamilyMembers(prev => prev.filter(member => member.id !== memberId))
      toast({
        title: "Success",
        description: "Family member deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting family member:', error)
      toast({
        title: "Error",
        description: "Failed to delete family member",
        variant: "destructive"
      })
    }
  }

  const handleUpdateFamilyMember = async (updatedMember: Partial<FamilyMember> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          full_name: updatedMember.full_name,
          email: updatedMember.email,
          phone: updatedMember.phone,
          family_position: updatedMember.family_position,
          relationship_to_family: updatedMember.relationship_to_family,
          trust_positions: updatedMember.trust_positions,
          notes: updatedMember.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMember.id)

      if (error) throw error

      // Update local state
      setFamilyMembers(prev => 
        prev.map(member => 
          member.id === updatedMember.id 
            ? { ...member, ...updatedMember, updated_at: new Date().toISOString() }
            : member
        )
      )

      setEditingMember(null)
      toast({
        title: "Success",
        description: "Family member updated successfully"
      })
    } catch (error) {
      console.error('Error updating family member:', error)
      toast({
        title: "Error",
        description: "Failed to update family member",
        variant: "destructive"
      })
    }
  }

  const handleResendInvitation = async (member: FamilyMember) => {
    if (!member.email) {
      toast({
        title: "Error",
        description: "No email address available for this member",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('Resending invitation for:', member.full_name)
      
      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      
      // Send family member invitation email
      const { data, error } = await supabase.functions.invoke('send-family-member-invitation', {
        body: {
          familyMemberId: member.id,
          email: member.email,
          firstName: member.full_name.split(' ')[0],
          lastName: member.full_name.split(' ').slice(1).join(' '),
          familyPosition: member.family_position || 'Family Member',
          tempPassword: tempPassword
        }
      })

      if (error) {
        console.error('Error resending invitation:', error)
        throw error
      }

      // Update the invitation timestamp
      const { error: updateError } = await supabase
        .from('family_members')
        .update({
          invitation_sent_at: new Date().toISOString(),
          is_invited: true
        })
        .eq('id', member.id)

      if (updateError) {
        console.error('Error updating invitation status:', updateError)
      }

      // Update local state
      setFamilyMembers(prev => 
        prev.map(m => 
          m.id === member.id 
            ? { ...m, invitation_sent_at: new Date().toISOString(), is_invited: true }
            : m
        )
      )

      toast({
        title: "Invitation Resent",
        description: `Invitation email has been resent to ${member.full_name}`,
      })

    } catch (error) {
      console.error('Error resending invitation:', error)
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleResendOfficeInvitation = async (member: FamilyOfficeMember) => {
    try {
      console.log('Resending office invitation for:', member.full_name)
      
      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      
      // Send office member invitation email using the same function (we can enhance it later)
      const { data, error } = await supabase.functions.invoke('send-family-member-invitation', {
        body: {
          familyMemberId: member.id,
          email: member.email,
          firstName: member.full_name.split(' ')[0],
          lastName: member.full_name.split(' ').slice(1).join(' '),
          familyPosition: member.role || 'Team Member',
          tempPassword: tempPassword,
          isOfficeTeam: true // Flag to differentiate office members
        }
      })

      if (error) {
        console.error('Error resending office invitation:', error)
        throw error
      }

      // Update the member status to indicate invitation was sent
      const { error: updateError } = await supabase
        .from('family_office_members' as any)
        .update({
          status: 'invited',
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (updateError) {
        console.error('Error updating invitation status:', updateError)
      }

      // Update local state
      setOfficeMembers(prev => 
        prev.map(m => 
          m.id === member.id 
            ? { ...m, status: 'invited', updated_at: new Date().toISOString() }
            : m
        )
      )

      toast({
        title: "Invitation Resent",
        description: `Invitation email has been resent to ${member.full_name}`,
      })

    } catch (error) {
      console.error('Error resending office invitation:', error)
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteOfficeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('family_office_members' as any)
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setOfficeMembers(prev => prev.filter(member => member.id !== memberId))
      toast({
        title: "Success",
        description: "Family office member deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting family office member:', error)
      toast({
        title: "Error",
        description: "Failed to delete family office member",
        variant: "destructive"
      })
    }
  }

  const handleUpdateOfficeMember = async (updatedMember: Partial<FamilyOfficeMember> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('family_office_members' as any)
        .update({
          full_name: updatedMember.full_name,
          email: updatedMember.email,
          phone: updatedMember.phone,
          role: updatedMember.role,
          company: updatedMember.company,
          department: updatedMember.department,
          access_level: updatedMember.access_level,
          specialties: updatedMember.specialties,
          notes: updatedMember.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMember.id)

      if (error) throw error

      // Update local state
      setOfficeMembers(prev => 
        prev.map(member => 
          member.id === updatedMember.id 
            ? { ...member, ...updatedMember, updated_at: new Date().toISOString() }
            : member
        )
      )

      setEditingOfficeMember(null)
      toast({
        title: "Success",
        description: "Office member updated successfully"
      })
    } catch (error) {
      console.error('Error updating office member:', error)
      toast({
        title: "Error",
        description: "Failed to update office member",
        variant: "destructive"
      })
    }
  }

  const getTrustPositionColor = (position: string) => {
    const colors = {
      'Trustee': 'bg-blue-100 text-blue-800',
      'Beneficiary': 'bg-green-100 text-green-800',
      'Protector': 'bg-purple-100 text-purple-800',
      'Investment Committee Member': 'bg-orange-100 text-orange-800',
      'Distribution Committee Member': 'bg-red-100 text-red-800',
      'Advisory Board Member': 'bg-gray-100 text-gray-800'
    }
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getAccessLevelColor = (level: string) => {
    const colors = {
      'Full Access': 'bg-red-100 text-red-800',
      'Financial Reports Only': 'bg-blue-100 text-blue-800',
      'Investment Data Only': 'bg-green-100 text-green-800',
      'Administrative Access': 'bg-purple-100 text-purple-800',
      'Limited Access': 'bg-yellow-100 text-yellow-800',
      'View Only': 'bg-gray-100 text-gray-800'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const LoadingSkeleton = () => (
    <div className="space-y-3 sm:space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="h-3 sm:h-4 bg-muted rounded w-1/3 mb-3 sm:mb-4"></div>
            <div className="h-2 sm:h-3 bg-muted rounded w-2/3"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const EmptyState = ({ type }: { type: 'family' | 'office' }) => (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-6 text-center">
        {type === 'family' ? (
          <>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">No family members added</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Start building your family directory
            </p>
          </>
        ) : (
          <>
            <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">No office members added</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Build your professional team
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage your family and professional team members
          </p>
        </div>

        <Tabs defaultValue="family" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="family" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Family</span>
              <span className="xs:hidden">Fam</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                {familyMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="office" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Office</span>
              <span className="xs:hidden">Off</span>
              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                {officeMembers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="family" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">Family Members</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Manage your family directory and relationships
                </p>
              </div>
              
              <Button 
                onClick={() => setShowAddFamilyDialog(true)} 
                className="flex items-center gap-2 text-sm h-9"
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden xs:inline">Add Family Member</span>
                <span className="xs:hidden">Add Member</span>
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <LoadingSkeleton />
              ) : familyMembers.length === 0 ? (
                <EmptyState type="family" />
              ) : (
                familyMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-2 sm:p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        {/* Mobile: Header with Avatar and Name */}
                        <div className="flex items-center gap-3 sm:items-start">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-xs sm:text-sm">
                              {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{member.full_name}</h3>
                              {member.family_position === 'Head of Family' && (
                                <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                              )}
                              {getStatusBadge(member)}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                              {member.family_position && (
                                <Badge variant="secondary" className="text-xs">{member.family_position}</Badge>
                              )}
                              {member.relationship_to_family && (
                                <span className="text-xs">• {member.relationship_to_family}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile: Action Buttons - Moved to top right on mobile */}
                        <div className="flex items-center gap-2 sm:ml-auto sm:flex-shrink-0">
                          {member.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(member)}
                              className="text-xs h-8 px-2"
                              disabled={!!member.joined_at}
                            >
                              <Mail className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">
                                {member.joined_at ? 'Accepted' : 'Resend'}
                              </span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMember(member)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFamilyMember(member.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Trust Positions */}
                      {member.trust_positions && member.trust_positions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.trust_positions.map(position => (
                            <Badge
                              key={position}
                              variant="outline"
                              className={`text-xs ${getTrustPositionColor(position)}`}
                            >
                              {position}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-3">
                        {member.email && (
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="office" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">Family Office Team</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Manage your professional advisors and staff
                </p>
              </div>
              
              <Button 
                onClick={() => setShowAddOfficeDialog(true)} 
                className="flex items-center gap-2 text-sm h-9"
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden xs:inline">Add Office Member</span>
                <span className="xs:hidden">Add Member</span>
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <LoadingSkeleton />
              ) : officeMembers.length === 0 ? (
                <EmptyState type="office" />
              ) : (
                officeMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        {/* Mobile: Header with Avatar and Name */}
                        <div className="flex items-center gap-3 sm:items-start">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-xs sm:text-sm">
                              {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{member.full_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {member.status}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                              {member.role && (
                                <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                              )}
                              {member.company && (
                                <span className="text-xs">• {member.company}</span>
                              )}
                              {member.department && (
                                <span className="text-xs">• {member.department}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile: Action Buttons */}
                        <div className="flex items-center gap-2 sm:ml-auto sm:flex-shrink-0">
                          {member.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendOfficeInvitation(member)}
                              className="text-xs h-8 px-2"
                              disabled={!!member.joined_at}
                            >
                              <Mail className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">
                                {member.joined_at ? 'Accepted' : 'Resend'}
                              </span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingOfficeMember(member)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOfficeMember(member.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Access Level */}
                      {member.access_level && (
                        <div className="mt-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getAccessLevelColor(member.access_level)}`}
                          >
                            {member.access_level}
                          </Badge>
                        </div>
                      )}

                      {/* Specialties */}
                      {member.specialties && member.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.specialties.map(specialty => (
                            <Badge
                              key={specialty}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700"
                            >
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-3">
                        <div className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AddFamilyMemberDialog 
          open={showAddFamilyDialog} 
          onOpenChange={setShowAddFamilyDialog}
        />
        
        <AddFamilyOfficeMemberDialog 
          open={showAddOfficeDialog} 
          onOpenChange={setShowAddOfficeDialog}
          onMemberAdded={fetchMembers}
        />

        <EditFamilyMemberDialog
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdate={handleUpdateFamilyMember}
        />

        <EditFamilyOfficeMemberDialog
          member={editingOfficeMember}
          onClose={() => setEditingOfficeMember(null)}
          onUpdate={handleUpdateOfficeMember}
        />
      </div>
    </div>
  )
}