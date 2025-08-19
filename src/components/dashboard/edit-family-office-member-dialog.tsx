import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

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
}

interface EditFamilyOfficeMemberDialogProps {
  member: FamilyOfficeMember | null
  onClose: () => void
  onUpdate: (updatedMember: Partial<FamilyOfficeMember> & { id: string }) => void
}

const officeRoles = [
  'Financial Advisor',
  'Investment Manager',
  'Tax Advisor',
  'Estate Planning Attorney',
  'Family Office Director',
  'Wealth Planner',
  'Risk Manager',
  'Trust Officer',
  'Philanthropic Advisor',
  'Business Manager',
  'Legal Counsel',
  'Accountant',
  'Private Banker',
  'Insurance Advisor',
  'Real Estate Advisor'
]

const accessLevels = [
  'Full Access',
  'Financial Reports Only',
  'Investment Data Only',
  'Administrative Access',
  'Limited Access',
  'View Only'
]

export function EditFamilyOfficeMemberDialog({ member, onClose, onUpdate }: EditFamilyOfficeMemberDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    company: '',
    department: '',
    access_level: '',
    notes: ''
  })
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || '',
        company: member.company || '',
        department: member.department || '',
        access_level: member.access_level || '',
        notes: member.notes || ''
      })
      setSelectedSpecialties(member.specialties || [])
    }
  }, [member])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    onUpdate({
      id: member.id,
      ...formData,
      specialties: selectedSpecialties
    })
  }

  if (!member) return null

  return (
    <Dialog open={!!member} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Family Office Member</DialogTitle>
          <DialogDescription>
            Update the details for this family office team member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Professional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="access_level">Access Level</Label>
                <Select value={formData.access_level} onValueChange={(value) => setFormData({ ...formData, access_level: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Specialties</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSpecialties.map(specialty => (
                <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                  {specialty}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeSpecialty(specialty)}
                  />
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom specialty"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialty())}
              />
              <Button type="button" variant="outline" onClick={addCustomSpecialty}>
                Add
              </Button>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}