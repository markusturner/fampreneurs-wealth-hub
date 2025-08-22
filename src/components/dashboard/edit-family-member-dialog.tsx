import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

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

interface EditFamilyMemberDialogProps {
  member: FamilyMember | null
  onClose: () => void
  onUpdate: (updatedMember: Partial<FamilyMember> & { id: string }) => void
}

const familyPositions = [
  'Head of Family',
  'Spouse/Partner',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Other Relative'
]

const trustPositions = [
  'Trustee',
  'Beneficiary',
  'Protector',
  'Investment Committee Member',
  'Distribution Committee Member',
  'Advisory Board Member'
]

const governancePositions = [
  // Family Council
  'Chairman',
  'Vice Chair',
  'Secretary',
  'Treasurer',
  'Operations Lead',
  'Council Member',
  // Council of Elders
  'Elder Advisor',
  'Elder Mentor',
  'Elder Mediator',
  // Family Assembly
  'Voting Member'
]

export function EditFamilyMemberDialog({ member, onClose, onUpdate }: EditFamilyMemberDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    family_position: '',
    relationship_to_family: '',
    trust_positions: [] as string[],
    governance_position: '',
    notes: ''
  })
  const [newTrustPosition, setNewTrustPosition] = useState('')

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        family_position: member.family_position || '',
        relationship_to_family: member.relationship_to_family || '',
        trust_positions: member.trust_positions || [],
        governance_position: member.trust_positions?.find(pos => governancePositions.includes(pos)) || '',
        notes: member.notes || ''
      })
    }
  }, [member])

  const addTrustPosition = (position: string) => {
    if (position && !formData.trust_positions.includes(position)) {
      setFormData(prev => ({
        ...prev,
        trust_positions: [...prev.trust_positions, position]
      }))
    }
    setNewTrustPosition('')
  }

  const removeTrustPosition = (position: string) => {
    setFormData(prev => ({
      ...prev,
      trust_positions: prev.trust_positions.filter(p => p !== position)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    // Merge governance position with trust positions
    let finalTrustPositions = formData.trust_positions.filter(pos => !governancePositions.includes(pos))
    
    if (formData.governance_position && formData.governance_position !== '') {
      finalTrustPositions = [...finalTrustPositions, formData.governance_position]
    }

    onUpdate({
      id: member.id,
      ...formData,
      trust_positions: finalTrustPositions
    })
  }

  if (!member) return null

  return (
    <Dialog open={!!member} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Family Member</DialogTitle>
          <DialogDescription>
            Update the family member's information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="family_position">Family Position *</Label>
              <Select
                value={formData.family_position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, family_position: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship Description</Label>
            <Input
              id="relationship"
              value={formData.relationship_to_family}
              onChange={(e) => setFormData(prev => ({ ...prev, relationship_to_family: e.target.value }))}
              placeholder="Describe relationship to family"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="governance_position">Family Governance Position</Label>
            <Select
              value={formData.governance_position}
              onValueChange={(value) => setFormData(prev => ({ ...prev, governance_position: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select governance position" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="">None</SelectItem>
                <SelectItem value="family-council-header" disabled className="font-semibold text-blue-600">Family Council</SelectItem>
                <SelectItem value="Chairman">Chairman</SelectItem>
                <SelectItem value="Vice Chair">Vice Chair</SelectItem>
                <SelectItem value="Secretary">Secretary</SelectItem>
                <SelectItem value="Treasurer">Treasurer</SelectItem>
                <SelectItem value="Operations Lead">Operations Lead</SelectItem>
                <SelectItem value="Council Member">Council Member</SelectItem>
                
                <SelectItem value="council-elders-header" disabled className="font-semibold text-emerald-600 mt-2">Council of Elders</SelectItem>
                <SelectItem value="Elder Advisor">Elder Advisor</SelectItem>
                <SelectItem value="Elder Mentor">Elder Mentor</SelectItem>
                <SelectItem value="Elder Mediator">Elder Mediator</SelectItem>
                
                <SelectItem value="family-assembly-header" disabled className="font-semibold text-purple-600 mt-2">Family Assembly</SelectItem>
                <SelectItem value="Voting Member">Voting Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trust Positions</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.trust_positions
                .filter(position => !governancePositions.includes(position))
                .map(position => (
                <Badge key={position} variant="secondary" className="flex items-center gap-1">
                  {position}
                  <button
                    type="button"
                    onClick={() => removeTrustPosition(position)}
                    className="text-xs hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(value) => addTrustPosition(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add trust position" />
              </SelectTrigger>
              <SelectContent>
                {trustPositions
                  .filter(pos => !formData.trust_positions.includes(pos))
                  .map(position => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newTrustPosition}
                onChange={(e) => setNewTrustPosition(e.target.value)}
                placeholder="Or add custom position"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTrustPosition(newTrustPosition)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTrustPosition(newTrustPosition)}
                disabled={!newTrustPosition}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information or notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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