import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { NavHeader } from '@/components/dashboard/nav-header'
import { AddFamilyMemberDialog } from '@/components/dashboard/add-family-member-dialog'

import { EditFamilyMemberDialog } from '@/components/dashboard/edit-family-member-dialog'
import { 
  UserPlus, 
  Mail, 
  Phone, 
  User, 
  Edit, 
  Trash2, 
  Users, 
  Crown
} from 'lucide-react'

interface FamilyMember {
  id: string
  added_by: string
  full_name: string
  family_position: string
  relationship_to_family: string | null
  email: string | null
  phone: string | null
  birthday: string | null
  trust_positions: string[] | null
  status: string | null
  is_invited: boolean | null
  notes: string | null
  created_at: string
  updated_at: string | null
  joined_at: string | null
  invitation_sent_at: string | null
}


export default function Members() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFamilyDialog, setShowAddFamilyDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchMembers()
    
    // Set up realtime subscription for family_members changes
    const channel = supabase
      .channel('family_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members'
        },
        () => {
          fetchMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      console.log('Fetching family members for user:', user.id)
      
      const { data: familyData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .is('office_role', null)
        .order('created_at', { ascending: false })

      console.log('Family members data:', familyData)
      console.log('Members error:', membersError)

      if (membersError) throw membersError

      setFamilyMembers(familyData || [])
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
      // Get the family member's email before deleting
      const memberToDelete = familyMembers.find(m => m.id === memberId)
      
      if (!memberToDelete) {
        throw new Error('Family member not found')
      }

      // Delete the family member record
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      // If the family member has an email, try to delete their user account
      if (memberToDelete.email) {
        try {
          // Find the user account with this email
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', memberToDelete.email)
            .maybeSingle()

          if (!profileError && profiles?.user_id) {
            // Delete the user account
            await supabase.functions.invoke('delete-user', {
              body: { userId: profiles.user_id }
            })
            console.log('Associated user account deleted')
          }
        } catch (userDeleteError) {
          console.error('Error deleting associated user account:', userDeleteError)
          // Don't throw - the family member was already deleted
        }
      }

      setFamilyMembers(prev => prev.filter(member => member.id !== memberId))
      setSelectedMembers(prev => {
        const newSet = new Set(prev)
        newSet.delete(memberId)
        return newSet
      })
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

  const handleDeleteSelected = async () => {
    if (selectedMembers.size === 0) return

    try {
      const memberIds = Array.from(selectedMembers)
      
      // Delete all selected members
      const { error } = await supabase
        .from('family_members')
        .delete()
        .in('id', memberIds)

      if (error) throw error

      // Try to delete associated user accounts
      for (const memberId of memberIds) {
        const member = familyMembers.find(m => m.id === memberId)
        if (member?.email) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('email', member.email)
              .maybeSingle()

            if (profiles?.user_id) {
              await supabase.functions.invoke('delete-user', {
                body: { userId: profiles.user_id }
              })
            }
          } catch (error) {
            console.error('Error deleting user account:', error)
          }
        }
      }

      setFamilyMembers(prev => prev.filter(member => !selectedMembers.has(member.id)))
      setSelectedMembers(new Set())
      toast({
        title: "Success",
        description: `${memberIds.length} member(s) deleted successfully`
      })
    } catch (error) {
      console.error('Error deleting members:', error)
      toast({
        title: "Error",
        description: "Failed to delete selected members",
        variant: "destructive"
      })
    }
  }

  const toggleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedMembers.size === familyMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(familyMembers.map(m => m.id)))
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
          governance_branch: (updatedMember as any).governance_branch,
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
      
      // Send family member invitation email with isResend flag
      const { data, error } = await supabase.functions.invoke('send-family-member-invitation', {
        body: {
          familyMemberId: member.id,
          email: member.email,
          firstName: member.full_name.split(' ')[0],
          lastName: member.full_name.split(' ').slice(1).join(' '),
          familyPosition: member.family_position || 'Family Member',
          isResend: true
        }
      })

      // Handle soft-failures returned by the edge function without throwing
      if (data && (data as any).success === false) {
        console.error('Invitation function responded with failure:', data)
        toast({
          title: 'Email not sent',
          description: (data as any).hint || (data as any).error || 'Email service not configured. Verify Resend domain and RESEND_FROM_EMAIL.',
          variant: 'destructive'
        })
        return
      }

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

  const EmptyState = () => (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-6 text-center">
        <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-muted-foreground opacity-50" />
        <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">No family members added</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
          Start building your family directory
        </p>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage your family and professional team members
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
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

            {familyMembers.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedMembers.size === familyMembers.length && familyMembers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({selectedMembers.size}/{familyMembers.length})
                  </label>
                </div>
                {selectedMembers.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="ml-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedMembers.size})
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-4">
              {loading ? (
                <LoadingSkeleton />
              ) : familyMembers.length === 0 ? (
                <EmptyState />
              ) : (
                familyMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-2 sm:p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        {/* Mobile: Header with Avatar and Name */}
                        <div className="flex items-center gap-3 sm:items-start">
                          <Checkbox
                            checked={selectedMembers.has(member.id)}
                            onCheckedChange={() => toggleSelectMember(member.id)}
                            className="mt-1"
                          />
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
        </div>

        {/* Dialogs */}
        <AddFamilyMemberDialog 
          open={showAddFamilyDialog} 
          onOpenChange={setShowAddFamilyDialog}
        />

        <EditFamilyMemberDialog
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdate={handleUpdateFamilyMember}
        />
      </div>
    </div>
  )
}