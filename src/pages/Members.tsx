import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { NavHeader } from '@/components/dashboard/nav-header'
import { FamilyOfficeSecurity } from '@/components/dashboard/family-office-security'
import { SecureFamilyMemberCard } from '@/components/dashboard/secure-family-member-card'
import { useFamilyOfficeSecurity } from '@/hooks/useFamilyOfficeSecurity'
import { UserPlus, Mail, Phone, User, Edit, Trash2, Users, Crown, Plus, Shield } from 'lucide-react'

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
}

const familyPositions = [
  'Head of Family',
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Uncle/Aunt',
  'Cousin',
  'Other'
]

const trustPositions = [
  'Trustee',
  'Beneficiary',
  'Protector',
  'Investment Committee Member',
  'Distribution Committee Member',
  'Advisory Board Member'
]

export default function Members() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { securitySettings } = useFamilyOfficeSecurity()
  const isSecurityEnabled = false // Simplified for now
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [newMember, setNewMember] = useState({
    full_name: '',
    family_position: '',
    relationship_to_family: '',
    email: '',
    phone: '',
    trust_positions: [] as string[],
    status: 'active',
    notes: ''
  })

  useEffect(() => {
    fetchFamilyMembers()
  }, [])

  const fetchFamilyMembers = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilyMembers(data || [])
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
    if (!user?.id || !newMember.full_name || !newMember.family_position) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsAddingMember(true)
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([{
          ...newMember,
          added_by: user.id,
          trust_positions: newMember.trust_positions.length > 0 ? newMember.trust_positions : null
        }])
        .select()

      if (error) throw error

      setFamilyMembers(prev => [data[0], ...prev])
      setNewMember({
        full_name: '',
        family_position: '',
        relationship_to_family: '',
        email: '',
        phone: '',
        trust_positions: [],
        status: 'active',
        notes: ''
      })

      toast({
        title: "Success",
        description: "Family member added successfully"
      })
    } catch (error) {
      console.error('Error adding family member:', error)
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive"
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleUpdateMember = async () => {
    if (!editingMember) return

    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          full_name: editingMember.full_name,
          family_position: editingMember.family_position,
          relationship_to_family: editingMember.relationship_to_family,
          email: editingMember.email,
          phone: editingMember.phone,
          trust_positions: editingMember.trust_positions,
          status: editingMember.status,
          notes: editingMember.notes
        })
        .eq('id', editingMember.id)

      if (error) throw error

      setFamilyMembers(prev => 
        prev.map(member => 
          member.id === editingMember.id ? editingMember : member
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

  const handleDeleteMember = async (memberId: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Family Members</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your family office members
            </p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Family Member Management */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Family Office Members</h2>
              <p className="text-sm text-muted-foreground">
                Add and manage members of your family office
              </p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Family Member</DialogTitle>
                  <DialogDescription>
                    Add a new member to your family office
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={newMember.full_name}
                      onChange={(e) => setNewMember(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="family_position">Family Position *</Label>
                    <Select
                      value={newMember.family_position}
                      onValueChange={(value) => setNewMember(prev => ({ ...prev, family_position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select family position" />
                      </SelectTrigger>
                      <SelectContent>
                        {familyPositions.map(position => (
                          <SelectItem key={position} value={position}>
                            {position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="relationship">Relationship to Family</Label>
                    <Input
                      id="relationship"
                      value={newMember.relationship_to_family}
                      onChange={(e) => setNewMember(prev => ({ ...prev, relationship_to_family: e.target.value }))}
                      placeholder="e.g., Blood relative, Spouse, etc."
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Trust Positions</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {trustPositions.map(position => (
                        <label key={position} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newMember.trust_positions.includes(position)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewMember(prev => ({
                                  ...prev,
                                  trust_positions: [...prev.trust_positions, position]
                                }))
                              } else {
                                setNewMember(prev => ({
                                  ...prev,
                                  trust_positions: prev.trust_positions.filter(p => p !== position)
                                }))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{position}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newMember.notes}
                      onChange={(e) => setNewMember(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this family member"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button onClick={handleAddMember} disabled={isAddingMember}>
                    {isAddingMember ? 'Adding...' : 'Add Member'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Family Members List */}
          <div className="grid gap-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : familyMembers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No family members added</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your family office by adding your first member
                    </p>
                  </CardContent>
                </Card>
              ) : (
                familyMembers.map((member) => (
                  isSecurityEnabled ? (
                    <SecureFamilyMemberCard
                      key={member.id}
                      member={member}
                      currentUserId={user?.id || ''}
                      isAdmin={true}
                      onEdit={() => setEditingMember(member)}
                      onDelete={() => handleDeleteMember(member.id)}
                    />
                  ) : (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/10">
                                {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{member.full_name}</h3>
                                {member.family_position === 'Head of Family' && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary">{member.family_position}</Badge>
                                {member.relationship_to_family && (
                                  <span>• {member.relationship_to_family}</span>
                                )}
                              </div>
                              
                              {member.trust_positions && member.trust_positions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
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
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                {member.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{member.email}</span>
                                  </div>
                                )}
                                {member.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{member.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMember(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {member.notes && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">{member.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                ))
              )}
            </div>

          {isSecurityEnabled && (
            <FamilyOfficeSecurity />
          )}
        </div>
      </div>

      {/* Edit Member Dialog */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Family Member</DialogTitle>
              <DialogDescription>
                Update family member information
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={editingMember.full_name}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_family_position">Family Position *</Label>
                <Select
                  value={editingMember.family_position}
                  onValueChange={(value) => setEditingMember(prev => prev ? { ...prev, family_position: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {familyPositions.map(position => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_relationship">Relationship to Family</Label>
                <Input
                  id="edit_relationship"
                  value={editingMember.relationship_to_family || ''}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, relationship_to_family: e.target.value } : null)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_phone">Phone Number</Label>
                <Input
                  id="edit_phone"
                  value={editingMember.phone || ''}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, phone: e.target.value } : null)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Trust Positions</Label>
                <div className="grid grid-cols-1 gap-2">
                  {trustPositions.map(position => (
                    <label key={position} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingMember.trust_positions?.includes(position) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingMember(prev => prev ? {
                              ...prev,
                              trust_positions: [...(prev.trust_positions || []), position]
                            } : null)
                          } else {
                            setEditingMember(prev => prev ? {
                              ...prev,
                              trust_positions: prev.trust_positions?.filter(p => p !== position) || null
                            } : null)
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{position}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editingMember.notes || ''}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMember}>
                Update Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Mobile Bottom Navigation Spacing */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}