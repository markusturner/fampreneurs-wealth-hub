import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, X, Plus } from 'lucide-react'

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
  services?: string[]
  notes?: string
  status?: string
}

interface AddFamilyOfficeMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMemberAdded?: () => void
  member?: FamilyOfficeMember | null
  mode?: 'add' | 'edit'
}

const officeRoles = [
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

const accessLevels = [
  'Full Access',
  'Financial Reports Only',
  'Investment Data Only',
  'Administrative Access',
  'Limited Access',
  'View Only'
]

const familyOfficeServices = [
  'Investment Management',
  'Tax Planning & Preparation',
  'Estate Planning',
  'Trust Administration',
  'Risk Management',
  'Insurance Planning',
  'Philanthropy Advisory',
  'Family Governance',
  'Next Generation Planning',
  'Business Management',
  'Legal Services',
  'Accounting & Bookkeeping',
  'Compliance & Regulatory',
  'Concierge Services',
  'Real Estate Management',
  'Art & Collectibles Management'
]

export function AddFamilyOfficeMemberDialog({ 
  open, 
  onOpenChange, 
  onMemberAdded,
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
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')

  const specialties = [
    'Investment Management',
    'Tax Planning',
    'Estate Planning',
    'Trust Administration',
    'Risk Management',
    'Philanthropy',
    'Business Management',
    'Compliance',
    'Legal Services',
    'Accounting',
    'Family Governance',
    'Next Generation Planning'
  ]

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
    setSelectedSpecialties([])
    setSelectedServices([])
    setCustomSpecialty('')
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
        accessLevel: member.access_level || '',
        notes: member.notes || ''
      })
      setSelectedSpecialties(member.specialties || [])
      setSelectedServices(member.services || [])
    } else {
      resetForm()
    }
  }, [member, mode])

  const addSpecialty = (specialty: string) => {
    if (specialty && !selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties([...selectedSpecialties, specialty])
    }
  }

  const removeSpecialty = (specialty: string) => {
    setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty))
  }

  const addCustomSpecialty = () => {
    if (customSpecialty.trim()) {
      addSpecialty(customSpecialty.trim())
      setCustomSpecialty('')
    }
  }

  const addService = (service: string) => {
    if (service && !selectedServices.includes(service)) {
      setSelectedServices([...selectedServices, service])
    }
  }

  const removeService = (service: string) => {
    setSelectedServices(selectedServices.filter(s => s !== service))
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
            access_level: formData.accessLevel || null,
            specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
            services: selectedServices.length > 0 ? selectedServices : null,
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
      // Generate temporary password and ID first
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
            access_level: formData.accessLevel || null,
            specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
            services: selectedServices.length > 0 ? selectedServices : null,
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
              <div>
                <Label htmlFor="role">Role</Label>
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

              <div>
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select value={formData.accessLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, accessLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Specialties</h3>
            
            <div>
              <Label>Select Specialties</Label>
              <Select onValueChange={addSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Add specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                placeholder="Add custom specialty"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialty())}
              />
              <Button type="button" onClick={addCustomSpecialty} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSpecialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="cursor-pointer">
                    {specialty}
                    <X 
                      className="h-3 w-3 ml-1" 
                      onClick={() => removeSpecialty(specialty)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Family Office Services</h3>
            
            <div>
              <Label>Select Services</Label>
              <Select onValueChange={addService}>
                <SelectTrigger>
                  <SelectValue placeholder="Add service" />
                </SelectTrigger>
                <SelectContent>
                  {familyOfficeServices.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service) => (
                  <Badge key={service} variant="outline" className="cursor-pointer">
                    {service}
                    <X 
                      className="h-3 w-3 ml-1" 
                      onClick={() => removeService(service)}
                    />
                  </Badge>
                ))}
              </div>
            )}
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