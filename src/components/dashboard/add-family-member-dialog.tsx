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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, X, Plus, TreePine, Info, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription } from '@/components/ui/card'

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const familyPositions = [
  'Patriarch/Matriarch',
  'Spouse',
  'Parent',
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

export function AddFamilyMemberDialog({ open, onOpenChange }: AddFamilyMemberDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthday: '',
    familyPosition: '',
    relationshipToFamily: '',
    governanceBranch: '',
    governancePosition: 'none',
    notes: ''
  })
  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      birthday: '',
      familyPosition: '',
      relationshipToFamily: '',
      governanceBranch: '',
      governancePosition: 'none',
      notes: ''
    })
    setAgreedToTerms(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide the full name.",
        variant: "destructive"
      })
      return
    }

    // Check for duplicate email if email is provided (only check visible family members, not office members)
    if (formData.email.trim()) {
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id, full_name')
        .eq('email', formData.email.trim())
        .eq('added_by', user?.id)
        .is('office_role', null)
        .maybeSingle()

      if (existingMember) {
        toast({
          title: "Duplicate Email",
          description: `This email is already used by ${existingMember.full_name}. Please use a different email address.`,
          variant: "destructive"
        })
        return
      }
    }

    setLoading(true)
    try {
      // First, insert the family member
      const { data: familyMemberData, error: familyMemberError } = await supabase
        .from('family_members')
        .insert({
          added_by: user?.id,
          full_name: formData.fullName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          birthday: formData.birthday || null,
          family_position: formData.familyPosition || null,
          trust_positions: formData.governancePosition && formData.governancePosition !== 'none' ? [formData.governancePosition] : null,
          relationship_to_family: formData.relationshipToFamily.trim() || null,
          governance_branch: formData.governanceBranch && formData.governanceBranch !== 'none' ? formData.governanceBranch : null,
          notes: formData.notes.trim() || null,
          status: 'pending'
        })
        .select()
        .single()

      if (familyMemberError) {
        console.error('Family member insertion error:', familyMemberError)
        throw familyMemberError
      }

      // If email is provided, create login credentials and send via email
      if (formData.email.trim()) {
        try {
          // Fetch active family secret code
          const { data: secretCodes } = await supabase
            .from('family_secret_codes')
            .select('code')
            .eq('is_active', true)
            .limit(1)
            .single();

          const familyCode = secretCodes?.code || null;

          // Generate temporary password
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          
          const { data, error: credentialsError } = await supabase.functions.invoke(
            'create-family-member-credentials',
            {
              body: {
                email: formData.email.trim(),
                firstName: formData.fullName.split(' ')[0],
                lastName: formData.fullName.split(' ').slice(1).join(' '),
                familyMemberId: familyMemberData.id,
                tempPassword: tempPassword
              }
            }
          );

          if (credentialsError) {
            console.error('Error creating credentials:', credentialsError);
            toast({
              title: "Family Member Added",
              description: `${formData.fullName} has been added but login credentials could not be created. You can create them manually later.`,
              variant: "destructive"
            });
            } else {
              // Send family member invitation email
              try {
                await supabase.functions.invoke('send-family-member-invitation', {
                  body: {
                    familyMemberId: familyMemberData.id,
                    email: formData.email.trim(),
                    firstName: formData.fullName.split(' ')[0],
                    lastName: formData.fullName.split(' ').slice(1).join(' '),
                    familyPosition: formData.familyPosition || 'Family Member',
                    tempPassword: tempPassword,
                    familyCode: familyCode
                  }
                });

                toast({
                  title: "Family Member Added Successfully",
                  description: `${formData.fullName} has been added and invitation email sent with login credentials.`,
                });
              } catch (emailError) {
                console.error('Error sending family member invitation email:', emailError);
                toast({
                  title: "Family Member Added",
                  description: `${formData.fullName} has been added with login access, but the invitation email could not be sent. Temporary password: ${tempPassword}`,
                  variant: "destructive"
                });
              }
            }
        } catch (credentialsError) {
          console.error('Error with credentials function:', credentialsError);
          toast({
            title: "Family Member Added",
            description: `${formData.fullName} has been added but login credentials could not be created.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Family Member Added",
          description: `${formData.fullName} has been added to your family directory.`
        });
      }

      resetForm()
      onOpenChange(false)
      
      // Trigger family tree update via custom event
      window.dispatchEvent(new CustomEvent('familyMemberAdded', { 
        detail: { memberName: formData.fullName } 
      }))
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

              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Family Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Family Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="familyPosition">Position in Family</Label>
                <Select value={formData.familyPosition} onValueChange={(value) => setFormData(prev => ({ ...prev, familyPosition: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family position (optional)" />
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

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">
                      TruHeirs Page Access Permissions
                    </Label>
                  </div>
                  <CardDescription className="text-xs">
                    Select which TruHeirs pages this family member can access.
                  </CardDescription>
                  <div className="space-y-2">
                    {[
                      { key: 'dashboard', label: 'Dashboard' },
                      { key: 'documents', label: 'Documents' },
                      { key: 'calendar', label: 'Family Calendar' },
                      { key: 'members', label: 'Family Members' },
                      { key: 'governance', label: 'Family Governance' },
                      { key: 'constitution', label: 'Family Constitution' },
                      { key: 'investments', label: 'Investments' },
                    ].map(page => (
                      <label key={page.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={(formData as any).permissions?.includes(page.key) || false}
                          onChange={(e) => {
                            const current = (formData as any).permissions || []
                            const updated = e.target.checked
                              ? [...current, page.key]
                              : current.filter((p: string) => p !== page.key)
                            setFormData(prev => ({ ...prev, permissions: updated } as any))
                          }}
                        />
                        <span className="text-sm">{page.label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="governanceBranch">Governance Branch</Label>
                <Select 
                  value={formData.governanceBranch}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, governanceBranch: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select governance branch (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="family_council">Family Council (Executive Branch)</SelectItem>
                    <SelectItem value="council_elders">Council of Elders (Judicial Branch)</SelectItem>
                    <SelectItem value="family_assembly">Family Assembly (Legislative Branch)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="governancePosition">Family Governance Position</Label>
                <Select 
                  value={formData.governancePosition} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, governancePosition: value }))}
                >
                  <SelectTrigger id="governancePosition">
                    <SelectValue placeholder="Select governance position (optional)" />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    sideOffset={5}
                    className="bg-popover border shadow-md z-[100] max-h-[300px] overflow-y-auto"
                  >
                    <SelectItem value="none">None</SelectItem>
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
            </div>
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

          {/* Family Member Agreement */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <Label className="text-sm font-semibold">Family Member Agreement</Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By adding this family member, you acknowledge and agree that all new family members will be required to complete a verification process upon joining, including identity verification, an onboarding form, and a program agreement. All family information, trust documents, financial records, and internal communications are strictly confidential and must never be shared with anyone outside the family. Violations may result in immediate removal of access.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="family-agreement"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
                />
                <label htmlFor="family-agreement" className="text-xs cursor-pointer leading-relaxed">
                  I agree that this family member must complete the full verification and onboarding process, and I understand that all family information is confidential and must not be shared externally.
                </label>
              </div>
            </CardContent>
          </Card>

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
              disabled={loading || !agreedToTerms}
              className="flex-1"
              style={{ backgroundColor: agreedToTerms ? '#ffb500' : undefined, color: agreedToTerms ? '#290a52' : undefined }}
            >
              {loading ? "Adding..." : "Add Family Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}