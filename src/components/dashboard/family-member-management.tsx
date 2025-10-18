import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Users, UserPlus, Crown, User, Trash2, Send, Mail, Phone } from 'lucide-react'

interface FamilyMember {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  family_position: string
  relationship_to_family: string | null
  trust_positions: string[] | null
  status: string
  is_invited: boolean
  invitation_sent_at: string | null
  joined_at: string | null
  notes: string | null
  added_by: string
  created_at: string
  updated_at: string | null
}

export function FamilyMemberManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newMember, setNewMember] = useState({
    full_name: '',
    email: '',
    phone: '',
    family_position: 'member',
    relationship_to_family: '',
    trust_positions: [] as string[],
    notes: ''
  })

  useEffect(() => {
    fetchFamilyMembers()
    
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
          fetchFamilyMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching family members:', error)
      toast({
        title: "Error",
        description: "Failed to fetch family members",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!user?.id || !newMember.full_name || !newMember.email) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          full_name: newMember.full_name,
          email: newMember.email,
          phone: newMember.phone || null,
          family_position: newMember.family_position,
          relationship_to_family: newMember.relationship_to_family || null,
          trust_positions: newMember.trust_positions.length > 0 ? newMember.trust_positions : null,
          notes: newMember.notes || null,
          added_by: user.id,
          status: 'pending',
          is_invited: true,
          invitation_sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setMembers(prev => [data, ...prev])
      setShowAddDialog(false)
      setNewMember({
        full_name: '',
        email: '',
        phone: '',
        family_position: 'member',
        relationship_to_family: '',
        trust_positions: [],
        notes: ''
      })

      toast({
        title: "Member Added",
        description: `Invitation sent to ${newMember.full_name}`,
      })

    } catch (error) {
      console.error('Error adding family member:', error)
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive"
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      // Get the family member's email before deleting
      const memberToDelete = members.find(m => m.id === memberId)
      
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

      setMembers(prev => prev.filter(member => member.id !== memberId))
      toast({
        title: "Member Removed",
        description: "Family member has been removed",
      })

    } catch (error) {
      console.error('Error removing family member:', error)
      toast({
        title: "Error",
        description: "Failed to remove family member",
        variant: "destructive"
      })
    }
  }

  const handleResendInvitation = async (member: FamilyMember) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          invitation_sent_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (error) throw error

      toast({
        title: "Invitation Resent",
        description: `Invitation resent to ${member.full_name}`,
      })

      fetchFamilyMembers()

    } catch (error) {
      console.error('Error resending invitation:', error)
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive"
      })
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'organizer':
        return <Crown className="h-4 w-4 text-yellow-600" />
      default:
        return <User className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusBadge = (member: FamilyMember) => {
    if (member.status === 'active') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
    } else if (member.is_invited) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
    } else {
      return <Badge variant="outline">Inactive</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Office Members
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage family members and their access to the family office
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Invite a family member to join the family office
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newMember.full_name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="family_position">Role</Label>
                <Select 
                  value={newMember.family_position} 
                  onValueChange={(value) => setNewMember(prev => ({ ...prev, family_position: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organizer">Organizer (Full Access)</SelectItem>
                    <SelectItem value="member">Member (View Access)</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                    <SelectItem value="trustee">Trustee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={newMember.relationship_to_family}
                  onChange={(e) => setNewMember(prev => ({ ...prev, relationship_to_family: e.target.value }))}
                  placeholder="e.g., Spouse, Child, Financial Advisor"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newMember.notes}
                  onChange={(e) => setNewMember(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes (optional)"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddMember} className="flex-1">
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Loading family members...</div>
            </CardContent>
          </Card>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                No family members added yet. Click "Add Member" to get started.
              </div>
            </CardContent>
          </Card>
        ) : (
          members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.full_name}</h3>
                        {getPositionIcon(member.family_position)}
                        {getStatusBadge(member)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {member.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                      
                      {member.relationship_to_family && (
                        <div className="text-sm text-muted-foreground">
                          Relationship: {member.relationship_to_family}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {member.family_position}
                        </Badge>
                        {member.trust_positions && member.trust_positions.length > 0 && (
                          member.trust_positions.map((position) => (
                            <Badge key={position} variant="outline" className="text-xs">
                              {position}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {member.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvitation(member)}
                        className="flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Resend
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveMember(member.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
                
                {member.notes && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{member.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}