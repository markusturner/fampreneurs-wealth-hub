import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Plus, Trash2, Edit, Check, X } from 'lucide-react'

interface FamilyOfficeMember {
  id?: string
  full_name: string
  email: string
  phone?: string
  role?: string
  company?: string
  department?: string
  access_level?: string
  notes?: string
  status?: string
}

interface AddFamilyOfficeMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded?: () => void
  onMemberDeleted?: () => void
  member?: FamilyOfficeMember | null
  mode?: 'add' | 'edit'
}

const defaultOfficeRoles = [
  'Chief Investment Officer',
  'Chief Financial Officer',
  'Investment Advisor',
  'Tax Advisor',
  'Estate Planning Attorney',
  'Family Office Manager',
  'Wealth Manager',
  'Accountant',
  'Legal Counsel',
  'Investment Analyst',
  'Administrative Assistant',
  'Compliance Officer',
  'Risk Manager',
  'Philanthropy Advisor',
  'Family Council Advisor',
  'Business Manager',
  'Other'
]


export function AddFamilyOfficeMemberDialog({ 
  open, 
  onOpenChange, 
  onMemberAdded,
  onMemberDeleted,
  member = null,
  mode = 'add'
}: AddFamilyOfficeMemberDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    company: '',
    department: '',
    notes: ''
  })
  
  // Role management state
  const [officeRoles, setOfficeRoles] = useState(defaultOfficeRoles)
  const [newRole, setNewRole] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editRoleValue, setEditRoleValue] = useState('')
  const [showRoleManager, setShowRoleManager] = useState(false)

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: '',
      company: '',
      department: '',
      notes: ''
    })
  }

  // Populate form when editing
  useEffect(() => {
    if (member && mode === 'edit') {
      setFormData({
        fullName: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || '',
        company: member.company || '',
        department: member.department || '',
        notes: member.notes || ''
      })
    } else {
      resetForm()
    }
  }, [member, mode])

  // Role management functions
  const addCustomRole = () => {
    if (newRole.trim() && !officeRoles.includes(newRole.trim())) {
      setOfficeRoles([...officeRoles, newRole.trim()])
      setNewRole('')
      toast({
        title: "Role Added",
        description: `"${newRole.trim()}" has been added to the roles list.`
      })
    }
  }

  const deleteRole = (roleToDelete: string) => {
    if (defaultOfficeRoles.includes(roleToDelete)) {
      toast({
        title: "Cannot Delete",
        description: "Default roles cannot be deleted.",
        variant: "destructive"
      })
      return
    }
    
    setOfficeRoles(officeRoles.filter(role => role !== roleToDelete))
    if (formData.role === roleToDelete) {
      setFormData(prev => ({ ...prev, role: '' }))
    }
    toast({
      title: "Role Deleted",
      description: `"${roleToDelete}" has been removed from the roles list.`
    })
  }

  const startEditingRole = (role: string) => {
    if (defaultOfficeRoles.includes(role)) {
      toast({
        title: "Cannot Edit",
        description: "Default roles cannot be edited.",
        variant: "destructive"
      })
      return
    }
    setEditingRole(role)
    setEditRoleValue(role)
  }

  const saveRoleEdit = () => {
    if (editRoleValue.trim() && editingRole) {
      const updatedRoles = officeRoles.map(role => 
        role === editingRole ? editRoleValue.trim() : role
      )
      setOfficeRoles(updatedRoles)
      
      if (formData.role === editingRole) {
        setFormData(prev => ({ ...prev, role: editRoleValue.trim() }))
      }
      
      setEditingRole(null)
      setEditRoleValue('')
      toast({
        title: "Role Updated",
        description: `Role has been updated to "${editRoleValue.trim()}".`
      })
    }
  }

  const cancelRoleEdit = () => {
    setEditingRole(null)
    setEditRoleValue('')
  }

  const handleDelete = async () => {
    if (!member?.id) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('family_office_members' as any)
        .delete()
        .eq('id', member.id)

      if (error) {
        throw error
      }

      toast({
        title: "Member Deleted",
        description: `${member.full_name} has been removed from your family office team.`
      })

      onOpenChange(false)
      onMemberDeleted?.()
    } catch (error) {
      console.error('Error deleting family office member:', error)
      toast({
        title: "Error",
        description: "Failed to delete family office member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim() || !formData.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide the full name and email.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      if (mode === 'edit' && member?.id) {
        // Update existing member
        const { error: updateError } = await supabase
          .from('family_office_members' as any)
          .update({
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            role: formData.role || null,
            company: formData.company.trim() || null,
            department: formData.department.trim() || null,
            notes: formData.notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id)

        if (updateError) {
          throw updateError
        }

        toast({
          title: "Member Updated Successfully",
          description: `${formData.fullName} has been updated.`
        })

        resetForm()
        onOpenChange(false)
        onMemberAdded?.()
        return
      }
      
      // Add new member logic
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const memberId = crypto.randomUUID();

      // Try to add the family office member to the table
      let officeMemberData: any = null;
      try {
        const result = await supabase
          .from('family_office_members' as any)
          .insert({
            added_by: user?.id,
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            role: formData.role || null,
            company: formData.company.trim() || null,
            department: formData.department.trim() || null,
            
            notes: formData.notes.trim() || null,
            status: 'active'
          })
          .select()
          .single()

        if (result.error) {
          console.warn('Family office members table not available:', result.error);
        } else {
          officeMemberData = result.data;
        }
      } catch (tableError) {
        console.warn('Family office members table not available, proceeding with credentials creation');
      }

      // Create login credentials and send via email
      try {
        const { data, error: credentialsError } = await supabase.functions.invoke(
          'create-family-member-credentials',
          {
            body: {
              email: formData.email.trim(),
              firstName: formData.fullName.split(' ')[0],
              lastName: formData.fullName.split(' ').slice(1).join(' '),
              familyMemberId: officeMemberData?.id || memberId,
              tempPassword: tempPassword
            }
          }
        );

        if (credentialsError) {
          console.error('Error creating credentials:', credentialsError);
          toast({
            title: "Family Office Member Added",
            description: `${formData.fullName} has been added but login credentials could not be created.`,
            variant: "destructive"
          });
        } else {
          // Send login credentials via email
          try {
            await supabase.functions.invoke('send-login-credentials', {
              body: {
                email: formData.email.trim(),
                firstName: formData.fullName.split(' ')[0],
                lastName: formData.fullName.split(' ').slice(1).join(' '),
                tempPassword: tempPassword,
                loginUrl: `${window.location.origin}/auth`,
                memberType: 'office',
                role: formData.role
              }
            });

            toast({
              title: "Family Office Member Added Successfully",
              description: `${formData.fullName} has been added to your family office team. Login credentials have been sent to their email.`
            });
          } catch (emailError) {
            console.error('Error sending login credentials email:', emailError);
            toast({
              title: "Family Office Member Added",
              description: `${formData.fullName} has been added with login access, but the email with credentials could not be sent. Temporary password: ${tempPassword}`,
              variant: "destructive"
            });
          }
        }
      } catch (credentialsError) {
        console.error('Error with credentials function:', credentialsError);
        toast({
          title: "Family Office Member Added",
          description: `${formData.fullName} has been added but login credentials could not be created.`,
          variant: "destructive"
        });
      }

      resetForm()
      onOpenChange(false)
      onMemberAdded?.()
    } catch (error) {
      console.error('Error adding family office member:', error)
      toast({
        title: "Error",
        description: "Failed to add family office member. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {mode === 'edit' ? 'Edit Family Office Member' : 'Add Family Office Member'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update the information for this family office team member.'
              : 'Add a professional team member to your family office.'
            }
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    required
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

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Professional Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Role Selection with Management */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="role">Role</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRoleManager((v) => !v)}
                    className="text-xs"
                    aria-expanded={showRoleManager}
                    aria-controls="role-manager"
                  >
                    {showRoleManager ? 'Hide Role Manager' : 'Manage Roles'}
                  </Button>
                </div>
                
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {showRoleManager && (
                  <div id="role-manager" className="mt-2">
                    {/* Add Custom Role */}
                    <div className="flex gap-2">
                      <Input
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="Add custom role"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
                      />
                      <Button type="button" onClick={addCustomRole} variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Manage Roles List */}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Default roles are locked and cannot be edited or deleted. Add a custom role if needed.
                    </p>
                    <div className="mt-2 space-y-1">
                      {officeRoles.map((role) => (
                        <div key={role} className="flex items-center justify-between rounded-md border px-2 py-1">
                          {editingRole === role ? (
                            <div className="flex items-center gap-2 w-full">
                              <Input
                                value={editRoleValue}
                                onChange={(e) => setEditRoleValue(e.target.value)}
                                className="h-7 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && saveRoleEdit()}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={saveRoleEdit}
                                className="h-7 w-7 p-0"
                                aria-label="Save role"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={cancelRoleEdit}
                                className="h-7 w-7 p-0"
                                aria-label="Cancel edit"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm">{role}</span>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditingRole(role)}
                                  className="h-7 w-7 p-0"
                                  aria-label={`Edit ${role}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteRole(role)}
                                  className="h-7 w-7 p-0 text-destructive"
                                  aria-label={`Delete ${role}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Department"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information about this team member"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {mode === 'edit' && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1"
            >
              {loading 
                ? (mode === 'edit' ? "Updating..." : "Adding...") 
                : (mode === 'edit' ? "Update Member" : "Add Team Member")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}