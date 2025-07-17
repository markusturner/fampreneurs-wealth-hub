import { useState } from 'react'
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

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const familyPositions = [
  'Patriarch/Matriarch',
  'Spouse',
  'Adult Child',
  'Minor Child',
  'Grandparent',
  'Grandchild',
  'Sibling',
  'Uncle/Aunt',
  'Cousin',
  'In-Law',
  'Guardian',
  'Other'
]

const trustPositions = [
  'Trustee',
  'Beneficiary',
  'Trust Protector',
  'Investment Advisor',
  'Distribution Committee Member',
  'Successor Trustee',
  'Trust Administrator',
  'Financial Advisor',
  'Estate Executor',
  'Power of Attorney',
  'Family Council Member',
  'Board Member'
]

export function AddFamilyMemberDialog({ open, onOpenChange }: AddFamilyMemberDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    familyPosition: '',
    relationshipToFamily: '',
    notes: ''
  })
  const [selectedTrustPositions, setSelectedTrustPositions] = useState<string[]>([])
  const [customTrustPosition, setCustomTrustPosition] = useState('')

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      familyPosition: '',
      relationshipToFamily: '',
      notes: ''
    })
    setSelectedTrustPositions([])
    setCustomTrustPosition('')
  }

  const addTrustPosition = (position: string) => {
    if (position && !selectedTrustPositions.includes(position)) {
      setSelectedTrustPositions([...selectedTrustPositions, position])
    }
  }

  const removeTrustPosition = (position: string) => {
    setSelectedTrustPositions(selectedTrustPositions.filter(p => p !== position))
  }

  const addCustomTrustPosition = () => {
    if (customTrustPosition.trim()) {
      addTrustPosition(customTrustPosition.trim())
      setCustomTrustPosition('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim() || !formData.familyPosition) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the full name and family position.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('family_members')
        .insert({
          added_by: user?.id,
          full_name: formData.fullName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          family_position: formData.familyPosition,
          trust_positions: selectedTrustPositions.length > 0 ? selectedTrustPositions : null,
          relationship_to_family: formData.relationshipToFamily.trim() || null,
          notes: formData.notes.trim() || null,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Family Member Added",
        description: `${formData.fullName} has been added to your family directory.`
      })

      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Error adding family member:', error)
      toast({
        title: "Error",
        description: "Failed to add family member. Please try again.",
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
            Add Family Member
          </DialogTitle>
          <DialogDescription>
            Add a family member to your directory for meeting notifications and family management.
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

          {/* Family Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Family Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="familyPosition">Position in Family *</Label>
                <Select value={formData.familyPosition} onValueChange={(value) => setFormData(prev => ({ ...prev, familyPosition: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family position" />
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
                <Label htmlFor="relationship">Relationship Description</Label>
                <Input
                  id="relationship"
                  value={formData.relationshipToFamily}
                  onChange={(e) => setFormData(prev => ({ ...prev, relationshipToFamily: e.target.value }))}
                  placeholder="e.g., Son of John Smith, Daughter-in-law"
                />
              </div>
            </div>
          </div>

          {/* Trust Positions */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Trust & Financial Positions</h3>
            
            <div>
              <Label>Select Trust Positions</Label>
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

            <div className="flex gap-2">
              <Input
                value={customTrustPosition}
                onChange={(e) => setCustomTrustPosition(e.target.value)}
                placeholder="Add custom trust position"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTrustPosition())}
              />
              <Button type="button" onClick={addCustomTrustPosition} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedTrustPositions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTrustPositions.map((position) => (
                  <Badge key={position} variant="secondary" className="cursor-pointer">
                    {position}
                    <X 
                      className="h-3 w-3 ml-1" 
                      onClick={() => removeTrustPosition(position)}
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
              placeholder="Any additional information about this family member"
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
              {loading ? "Adding..." : "Add Family Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}