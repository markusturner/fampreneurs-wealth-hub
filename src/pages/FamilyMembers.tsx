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
import { Scoreboard } from '@/components/dashboard/scoreboard'
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
  governance_branch?: 'family_council' | 'council_elders' | 'family_assembly' | null
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
  'Trust Protector',
  'Investment Committee Member',
  'Distribution Committee Member',
  'Advisory Committee Member'
]

const governanceBranches = [
  { value: 'family_council', label: 'Family Council (Executive Branch)' },
  { value: 'council_elders', label: 'Council of Elders (Judicial Branch)' },
  { value: 'family_assembly', label: 'Family Assembly (Legislative Branch)' }
]

export default function FamilyMembers() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { logSecurityAction } = useFamilyOfficeSecurity()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSecurity, setShowSecurity] = useState(false)
  
  const [formData, setFormData] = useState({
    fullName: '',
    familyPosition: '',
    relationshipToFamily: '',
    email: '',
    phone: '',
    notes: '',
    governanceBranch: ''
  })
  const [selectedTrustPositions, setSelectedTrustPositions] = useState<string[]>([])

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
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
        description: "Failed to load family members",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      familyPosition: '',
      relationshipToFamily: '',
      email: '',
      phone: '',
      notes: '',
      governanceBranch: ''
    })
    setSelectedTrustPositions([])
    setEditingMember(null)
  }

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member)
    setFormData({
      fullName: member.full_name,
      familyPosition: member.family_position,
      relationshipToFamily: member.relationship_to_family || '',
      email: member.email || '',
      phone: member.phone || '',
      notes: member.notes || '',
      governanceBranch: member.governance_branch || ''
    })
    setSelectedTrustPositions(member.trust_positions || [])
    setDialogOpen(true)
  }

  const addTrustPosition = (position: string) => {
    if (position && !selectedTrustPositions.includes(position)) {
      setSelectedTrustPositions([...selectedTrustPositions, position])
    }
  }

  const removeTrustPosition = (position: string) => {
    setSelectedTrustPositions(selectedTrustPositions.filter(p => p !== position))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim() || !formData.familyPosition) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the member's name and family position.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const memberData = {
        full_name: formData.fullName.trim(),
        family_position: formData.familyPosition,
        relationship_to_family: formData.relationshipToFamily.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        trust_positions: selectedTrustPositions.length > 0 ? selectedTrustPositions : null,
        governance_branch: formData.governanceBranch || null,
        notes: formData.notes.trim() || null,
        status: 'active'
      }

      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', editingMember.id)

        if (error) throw error

        toast({
          title: "Member Updated",
          description: `${formData.fullName} has been updated successfully.`
        })
      } else {
        // Add new member
        const { error } = await supabase
          .from('family_members')
          .insert({
            ...memberData,
            added_by: user?.id
          })

        if (error) throw error

        toast({
          title: "Member Added",
          description: `${formData.fullName} has been added to your family.`
        })
      }

      resetForm()
      setDialogOpen(false)
      fetchMembers()
    } catch (error) {
      console.error('Error saving family member:', error)
      toast({
        title: "Error",
        description: "Failed to save family member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMember = async (member: FamilyMember) => {
    if (!confirm(`Are you sure you want to remove ${member.full_name} from your family?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', member.id)

      if (error) throw error

      toast({
        title: "Member Removed",
        description: `${member.full_name} has been removed from your family.`
      })

      fetchMembers()
    } catch (error) {
      console.error('Error deleting family member:', error)
      toast({
        title: "Error",
        description: "Failed to remove family member. Please try again.",
        variant: "destructive"
      })
    }
  }

  const canEditMember = (member: FamilyMember) => {
    return member.added_by === user?.id || profile?.is_admin
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Family Members</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your family members and their roles with enhanced security
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowSecurity(!showSecurity)} 
              variant="outline" 
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Security Settings
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Family Member</span>
                  <span className="sm:hidden">Add Member</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto mx-3 sm:mx-0 max-w-[calc(100vw-24px)]">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingMember ? 'Update family member information' : 'Add a new member to your family'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="familyPosition">Family Position *</Label>
                        <Select value={formData.familyPosition} onValueChange={(value) => setFormData(prev => ({ ...prev, familyPosition: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {familyPositions.map((position) => (
                              <SelectItem key={position} value={position}>
                                {position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="relationshipToFamily">Relationship</Label>
                        <Input
                          id="relationshipToFamily"
                          value={formData.relationshipToFamily}
                          onChange={(e) => setFormData(prev => ({ ...prev, relationshipToFamily: e.target.value }))}
                          placeholder="e.g., Father-in-law"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust Positions */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Trust Positions</h3>
                  
                  <div>
                    <Label>Trust/Entity Positions</Label>
                    <Select onValueChange={addTrustPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add trust position" />
                      </SelectTrigger>
                      <SelectContent>
                        {trustPositions.map((position) => (
                          <SelectItem key={position} value={position}>
                            {position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTrustPositions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTrustPositions.map((position) => (
                        <Badge key={position} variant="secondary" className="cursor-pointer">
                          {position}
                          <button
                            type="button"
                            className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-xs"
                            onClick={() => removeTrustPosition(position)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Governance Branch */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Family Governance Position</h3>
                  
                  <div>
                    <Label htmlFor="governanceBranch">Governance Branch</Label>
                    <Select value={formData.governanceBranch} onValueChange={(value) => setFormData(prev => ({ ...prev, governanceBranch: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select governance branch (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {governanceBranches.map((branch) => (
                          <SelectItem key={branch.value} value={branch.value}>
                            {branch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assign this member to a governance branch for decision-making responsibilities
                    </p>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Additional Information</h3>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this family member"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Security Settings Section */}
        {showSecurity && (
          <Card>
            <CardContent className="p-6">
              <FamilyOfficeSecurity />
            </CardContent>
          </Card>
        )}

        <Scoreboard />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Trust Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.filter(m => m.trust_positions && m.trust_positions.length > 0).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Members
            </CardTitle>
            <CardDescription>
              Manage your family members and their roles in the family office
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No family members found</p>
                <p className="text-sm">Add your first family member to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <SecureFamilyMemberCard
                    key={member.id}
                    member={member}
                    currentUserId={user?.id || ''}
                    isAdmin={profile?.is_admin || false}
                    onEdit={openEditDialog}
                    onDelete={deleteMember}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}