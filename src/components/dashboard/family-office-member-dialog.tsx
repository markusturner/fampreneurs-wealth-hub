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

interface OfficeRole {
  id?: string
  name: string
  services: string[]
  is_default?: boolean
}

interface OfficeService {
  id?: string
  name: string
  description?: string
  is_default?: boolean
  is_active?: boolean
}

interface FamilyOfficeMember {
  id?: string
  full_name: string
  email: string
  phone?: string
  role?: string
  company?: string
  department?: string
  access_level?: string
  specialties?: string[]
  notes?: string
  status?: string
  office_role?: string
  office_services?: string[]
}

interface AddFamilyOfficeMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded?: () => void
  onMemberDeleted?: () => void
  member?: FamilyOfficeMember | null
  mode?: 'add' | 'edit'
}

const defaultOfficeRoles: OfficeRole[] = [
  { name: 'Chief Investment Officer', services: ['Investment Management', 'Portfolio Management', 'Risk Assessment'], is_default: true },
  { name: 'Chief Financial Officer', services: ['Financial Planning', 'Budgeting', 'Cash Flow'], is_default: true },
  { name: 'Investment Advisor', services: ['Investment Management', 'Portfolio Management'], is_default: true },
  { name: 'Tax Advisor', services: ['Tax Planning', 'Returns', 'Strategy'], is_default: true },
  { name: 'Estate Planning Attorney', services: ['Wills', 'Trusts', 'Succession Planning'], is_default: true },
  { name: 'Family Office Manager', services: ['Family Governance', 'Administration'], is_default: true },
  { name: 'Wealth Manager', services: ['Wealth Planning', 'Investment Management'], is_default: true },
  { name: 'Accountant', services: ['Accounting Services', 'Tax Planning'], is_default: true },
  { name: 'Legal Counsel', services: ['Legal Advisory', 'Contract Review', 'Compliance'], is_default: true },
  { name: 'Investment Analyst', services: ['Investment Research', 'Market Analysis'], is_default: true },
  { name: 'Administrative Assistant', services: ['Administration', 'Support Services'], is_default: true },
  { name: 'Compliance Officer', services: ['Compliance', 'Risk Management'], is_default: true },
  { name: 'Risk Manager', services: ['Risk Management', 'Insurance Planning'], is_default: true },
  { name: 'Philanthropy Advisor', services: ['Philanthropy Advisory', 'Charitable Giving'], is_default: true },
  { name: 'Family Council Advisor', services: ['Family Governance', 'Family Education'], is_default: true },
  { name: 'Business Manager', services: ['Business Advisory', 'Operations Management'], is_default: true },
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
    accessLevel: '',
    notes: ''
  })
  
  // Role management state with persistent storage
  const [officeRoles, setOfficeRoles] = useState<OfficeRole[]>([])
  const [newRole, setNewRole] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editRoleValue, setEditRoleValue] = useState('')
  const [showRoleManager, setShowRoleManager] = useState(false)
  
  // Services management state
  const [availableServices, setAvailableServices] = useState<OfficeService[]>([])
  const [newService, setNewService] = useState('')
  const [newServiceDescription, setNewServiceDescription] = useState('')
  const [editingService, setEditingService] = useState<string | null>(null)
  const [editServiceName, setEditServiceName] = useState('')
  const [editServiceDescription, setEditServiceDescription] = useState('')
  const [showServiceManager, setShowServiceManager] = useState(false)

  // Load persistent roles and services from Supabase
  const loadRoles = async () => {
    if (!user?.id) return

    try {
      const { data: existingRoles, error } = await supabase
        .from('office_roles_catalog')
        .select('*')
        .eq('created_by', user.id)
        .order('name')

      if (error) {
        console.error('Error loading roles:', error)
        // Fall back to defaults
        setOfficeRoles(defaultOfficeRoles)
        return
      }

      if (!existingRoles || existingRoles.length === 0) {
        // First time - seed with defaults
        await seedDefaultRoles()
      } else {
        // Load existing roles
        setOfficeRoles(existingRoles.map(role => ({
          id: role.id,
          name: role.name,
          services: role.services || [],
          is_default: role.is_default
        })))
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      setOfficeRoles(defaultOfficeRoles)
    }
  }

  // Load services from database
  const loadServices = async () => {
    if (!user?.id) return

    try {
      const { data: services, error } = await supabase
        .from('office_services_catalog')
        .select('*')
        .or(`created_by.eq.${user.id},is_default.eq.true`)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading services:', error)
        return
      }

      // Deduplicate services by name (case-insensitive)
      const uniqueServices = services.reduce((acc, service) => {
        const existingService = acc.find(s => s.name.toLowerCase() === service.name.toLowerCase())
        if (!existingService) {
          acc.push({
            id: service.id,
            name: service.name,
            description: service.description,
            is_default: service.is_default,
            is_active: service.is_active
          })
        }
        return acc
      }, [] as OfficeService[])
      
      setAvailableServices(uniqueServices)
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  // Seed default roles on first use
  const seedDefaultRoles = async () => {
    if (!user?.id) return

    try {
      const rolesToInsert = defaultOfficeRoles.map(role => ({
        created_by: user.id,
        name: role.name,
        services: role.services,
        is_default: true
      }))

      const { data, error } = await supabase
        .from('office_roles_catalog')
        .insert(rolesToInsert)
        .select()

      if (error) {
        console.error('Error seeding roles:', error)
        setOfficeRoles(defaultOfficeRoles)
        return
      }

      setOfficeRoles(data.map(role => ({
        id: role.id,
        name: role.name,
        services: role.services || [],
        is_default: role.is_default
      })))
    } catch (error) {
      console.error('Error seeding roles:', error)
      setOfficeRoles(defaultOfficeRoles)
    }
  }

  // Load roles and services when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      loadRoles()
      loadServices()
    }
  }, [open, user?.id])

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: '',
      company: '',
      department: '',
      accessLevel: '',
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
        role: member.office_role || member.role || '',
        company: member.company || '',
        department: member.department || '',
        accessLevel: member.access_level || '',
        notes: member.notes || ''
      })
    } else {
      resetForm()
    }
  }, [member, mode])

  // Role management functions with persistent storage
  const addCustomRole = async () => {
    if (!newRole.trim() || !user?.id) return
    
    const roleExists = officeRoles.some(role => role.name.toLowerCase() === newRole.trim().toLowerCase())
    if (roleExists) {
      toast({
        title: "Role Already Exists",
        description: `"${newRole.trim()}" is already in the roles list.`,
        variant: "destructive"
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('office_roles_catalog')
        .insert({
          created_by: user.id,
          name: newRole.trim(),
          services: [],
          is_default: false
        })
        .select()
        .single()

      if (error) throw error

      const newRoleObj: OfficeRole = {
        id: data.id,
        name: data.name,
        services: data.services || [],
        is_default: false
      }

      setOfficeRoles([...officeRoles, newRoleObj])
      setNewRole('')
      toast({
        title: "Role Added",
        description: `"${newRole.trim()}" has been permanently added to the roles list.`
      })
    } catch (error) {
      console.error('Error adding role:', error)
      toast({
        title: "Error",
        description: "Failed to add role. Please try again.",
        variant: "destructive"
      })
    }
  }

  const deleteRole = async (roleToDelete: OfficeRole) => {
    if (!user?.id) return

    try {
      if (roleToDelete.id) {
        const { error } = await supabase
          .from('office_roles_catalog')
          .delete()
          .eq('id', roleToDelete.id)

        if (error) throw error
      }

      setOfficeRoles(officeRoles.filter(role => role.name !== roleToDelete.name))
      if (formData.role === roleToDelete.name) {
        setFormData(prev => ({ ...prev, role: '' }))
      }
      
      toast({
        title: "Role Deleted",
        description: `"${roleToDelete.name}" has been permanently removed from the roles list.`
      })
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive"
      })
    }
  }

  const startEditingRole = (role: OfficeRole) => {
    setEditingRole(role.name)
    setEditRoleValue(role.name)
  }

  const saveRoleEdit = async () => {
    if (!editRoleValue.trim() || !editingRole || !user?.id) return

    const roleToEdit = officeRoles.find(role => role.name === editingRole)
    if (!roleToEdit?.id) return

    try {
      const { error } = await supabase
        .from('office_roles_catalog')
        .update({ name: editRoleValue.trim() })
        .eq('id', roleToEdit.id)

      if (error) throw error

      const updatedRoles = officeRoles.map(role => 
        role.name === editingRole ? { ...role, name: editRoleValue.trim() } : role
      )
      setOfficeRoles(updatedRoles)
      
      if (formData.role === editingRole) {
        setFormData(prev => ({ ...prev, role: editRoleValue.trim() }))
      }
      
      setEditingRole(null)
      setEditRoleValue('')
      toast({
        title: "Role Updated",
        description: `Role has been permanently updated to "${editRoleValue.trim()}".`
      })
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive"
      })
    }
  }

  const cancelRoleEdit = () => {
    setEditingRole(null)
    setEditRoleValue('')
  }

  const toggleServiceForRole = async (roleToUpdate: OfficeRole, service: string) => {
    if (!roleToUpdate.id || !user?.id) return

    const currentServices = roleToUpdate.services || []
    const newServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service]
    
    try {
      const { error } = await supabase
        .from('office_roles_catalog')
        .update({ services: newServices })
        .eq('id', roleToUpdate.id)

      if (error) throw error

      setOfficeRoles(officeRoles.map(role => 
        role.id === roleToUpdate.id ? { ...role, services: newServices } : role
      ))
    } catch (error) {
      console.error('Error updating role services:', error)
      toast({
        title: "Error",
        description: "Failed to update role services. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Service management functions
  const addCustomService = async () => {
    if (!newService.trim() || !user?.id) return
    
    const serviceExists = availableServices.some(service => service.name.toLowerCase() === newService.trim().toLowerCase())
    if (serviceExists) {
      toast({
        title: "Service Already Exists",
        description: `"${newService.trim()}" is already in the services list.`,
        variant: "destructive"
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('office_services_catalog')
        .insert({
          created_by: user.id,
          name: newService.trim(),
          description: newServiceDescription.trim() || null,
          is_default: false,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      const newServiceObj: OfficeService = {
        id: data.id,
        name: data.name,
        description: data.description,
        is_default: false,
        is_active: true
      }

      setAvailableServices([...availableServices, newServiceObj])
      setNewService('')
      setNewServiceDescription('')
      toast({
        title: "Service Added",
        description: `"${newService.trim()}" has been added to the services list.`
      })
    } catch (error) {
      console.error('Error adding service:', error)
      toast({
        title: "Error",
        description: "Failed to add service. Please try again.",
        variant: "destructive"
      })
    }
  }

  const deleteService = async (serviceToDelete: OfficeService) => {
    if (!user?.id || serviceToDelete.is_default) {
      toast({
        title: "Cannot Delete",
        description: "Default services cannot be deleted.",
        variant: "destructive"
      })
      return
    }

    try {
      if (serviceToDelete.id) {
        const { error } = await supabase
          .from('office_services_catalog')
          .delete()
          .eq('id', serviceToDelete.id)

        if (error) throw error
      }

      setAvailableServices(availableServices.filter(service => service.id !== serviceToDelete.id))
      
      // Remove service from all roles that use it
      const updatedRoles = officeRoles.map(role => ({
        ...role,
        services: role.services.filter(s => s !== serviceToDelete.name)
      }))
      setOfficeRoles(updatedRoles)
      
      toast({
        title: "Service Deleted",
        description: `"${serviceToDelete.name}" has been removed from the services list.`
      })
    } catch (error) {
      console.error('Error deleting service:', error)
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive"
      })
    }
  }

  const startEditingService = (service: OfficeService) => {
    setEditingService(service.id || '')
    setEditServiceName(service.name)
    setEditServiceDescription(service.description || '')
  }

  const saveServiceEdit = async () => {
    if (!editServiceName.trim() || !editingService || !user?.id) return

    const serviceToEdit = availableServices.find(service => service.id === editingService)
    if (!serviceToEdit?.id || serviceToEdit.is_default) {
      toast({
        title: "Cannot Edit",
        description: "Default services cannot be edited.",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('office_services_catalog')
        .update({ 
          name: editServiceName.trim(),
          description: editServiceDescription.trim() || null
        })
        .eq('id', serviceToEdit.id)

      if (error) throw error

      const updatedServices = availableServices.map(service => 
        service.id === editingService 
          ? { ...service, name: editServiceName.trim(), description: editServiceDescription.trim() }
          : service
      )
      setAvailableServices(updatedServices)
      
      // Update roles that use this service
      const updatedRoles = officeRoles.map(role => ({
        ...role,
        services: role.services.map(s => s === serviceToEdit.name ? editServiceName.trim() : s)
      }))
      setOfficeRoles(updatedRoles)
      
      setEditingService(null)
      setEditServiceName('')
      setEditServiceDescription('')
      toast({
        title: "Service Updated",
        description: `Service has been updated to "${editServiceName.trim()}".`
      })
    } catch (error) {
      console.error('Error updating service:', error)
      toast({
        title: "Error",
        description: "Failed to update service. Please try again.",
        variant: "destructive"
      })
    }
  }

  const cancelServiceEdit = () => {
    setEditingService(null)
    setEditServiceName('')
    setEditServiceDescription('')
  }

  const handleDelete = async () => {
    if (!member?.id) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('family_members')
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
      // Get selected services for the chosen role
      const selectedRole = officeRoles.find(role => role.name === formData.role)
      const selectedServices = selectedRole?.services || []

      if (mode === 'edit' && member?.id) {
        // Update existing member
        const { error: updateError } = await supabase
          .from('family_members')
          .update({
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            office_role: formData.role || null,
            office_services: selectedServices.length > 0 ? selectedServices : null,
            company: formData.company.trim() || null,
            department: formData.department.trim() || null,
            access_level: formData.accessLevel || null,
            notes: formData.notes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id)

        if (updateError) {
          throw updateError
        }

        toast({
          title: "Member Updated Successfully",
          description: `${formData.fullName} has been updated with their role and services.`
        })

        resetForm()
        onOpenChange(false)
        onMemberAdded?.()
        return
      }
      
      // Add new member logic
      const { data: insertData, error: insertError } = await supabase
        .from('family_members')
        .insert({
          added_by: user?.id,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          family_position: 'Family Office Team',
          office_role: formData.role || null,
          office_services: selectedServices.length > 0 ? selectedServices : null,
          company: formData.company.trim() || null,
          department: formData.department.trim() || null,
          access_level: formData.accessLevel || null,
          notes: formData.notes.trim() || null,
          status: 'active'
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast({
        title: "Family Office Member Added Successfully",
        description: `${formData.fullName} has been added to your family office team with their role and services.`
      })

      resetForm()
      onOpenChange(false)
      onMemberAdded?.()
    } catch (error) {
      console.error('Error adding/updating family office member:', error)
      toast({
        title: "Error",
        description: `Failed to ${mode === 'edit' ? 'update' : 'add'} family office member. Please try again.`,
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
                      <SelectItem key={role.name} value={role.name}>
                        {role.name}
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
                    <div className="mt-3 space-y-3">
                      {officeRoles.map((role) => (
                        <div key={role.name} className="rounded-md border p-3">
                          <div className="flex items-center justify-between mb-2">
                            {editingRole === role.name ? (
                              <div className="flex items-center gap-2 flex-1">
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
                                <span className="text-sm font-medium">{role.name}</span>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditingRole(role)}
                                    className="h-7 w-7 p-0"
                                    aria-label={`Edit ${role.name}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteRole(role)}
                                    className="h-7 w-7 p-0 text-destructive"
                                    aria-label={`Delete ${role.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Services for this role */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs text-muted-foreground">Services:</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowServiceManager((v) => !v)}
                                className="text-xs h-6"
                              >
                                {showServiceManager ? 'Hide Service Manager' : 'Manage Services'}
                              </Button>
                            </div>
                            
                            {showServiceManager && (
                              <div className="mb-3 p-2 border rounded-md bg-muted/50">
                                {/* Add New Service */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex gap-2">
                                    <Input
                                      value={newService}
                                      onChange={(e) => setNewService(e.target.value)}
                                      placeholder="Service name"
                                      className="flex-1 h-7 text-xs"
                                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                                    />
                                    <Button type="button" onClick={addCustomService} variant="outline" size="sm" className="h-7">
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Input
                                    value={newServiceDescription}
                                    onChange={(e) => setNewServiceDescription(e.target.value)}
                                    placeholder="Service description (optional)"
                                    className="h-7 text-xs"
                                  />
                                </div>

                                {/* Manage Services List */}
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {availableServices.map((service) => (
                                    <div key={service.id} className="flex items-center justify-between p-1 rounded border bg-background">
                                      {editingService === service.id ? (
                                        <div className="flex items-center gap-1 flex-1">
                                          <div className="flex-1 space-y-1">
                                            <Input
                                              value={editServiceName}
                                              onChange={(e) => setEditServiceName(e.target.value)}
                                              className="h-6 text-xs"
                                              onKeyDown={(e) => e.key === 'Enter' && saveServiceEdit()}
                                            />
                                            <Input
                                              value={editServiceDescription}
                                              onChange={(e) => setEditServiceDescription(e.target.value)}
                                              placeholder="Description"
                                              className="h-6 text-xs"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={saveServiceEdit}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={cancelServiceEdit}
                                            className="h-6 w-6 p-0"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex-1">
                                            <span className="text-xs font-medium">{service.name}</span>
                                            {service.description && (
                                              <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                                            )}
                                          </div>
                                          <div className="flex gap-1">
                                            {!service.is_default && (
                                              <>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => startEditingService(service)}
                                                  className="h-6 w-6 p-0"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => deleteService(service)}
                                                  className="h-6 w-6 p-0 text-destructive"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              {availableServices.map((service) => (
                                <label key={service.id} className="flex items-center space-x-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={(role.services || []).includes(service.name)}
                                    onChange={() => toggleServiceForRole(role, service.name)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="truncate">{service.name}</span>
                                </label>
                              ))}
                            </div>
                            {role.services && role.services.length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <span className="font-medium">Services included:</span> {role.services.join(', ')}
                                <div className="text-xs text-foreground mt-1 font-medium">
                                  ➤ Will add 1 combined service to Family Office Services tab
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Professional Details */}
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
                  placeholder="Department or division"
                />
              </div>

              <div>
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select value={formData.accessLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, accessLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Access">Full Access</SelectItem>
                    <SelectItem value="Financial Reports Only">Financial Reports Only</SelectItem>
                    <SelectItem value="Investment Data Only">Investment Data Only</SelectItem>
                    <SelectItem value="Administrative Access">Administrative Access</SelectItem>
                    <SelectItem value="Limited Access">Limited Access</SelectItem>
                    <SelectItem value="View Only">View Only</SelectItem>
                  </SelectContent>
                </Select>
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