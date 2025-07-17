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
import { UserPlus, Mail, Phone, Globe, Linkedin, Briefcase, DollarSign, Calendar, Plus, X, Edit, Trash2 } from 'lucide-react'

interface FinancialAdvisor {
  id: string
  added_by: string
  full_name: string
  company: string | null
  title: string | null
  email: string | null
  phone: string | null
  specialties: string[] | null
  license_number: string | null
  years_experience: number | null
  hourly_rate: number | null
  bio: string | null
  website: string | null
  linkedin_url: string | null
  is_active: boolean
  preferred_contact_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const specialtyOptions = [
  'Investment Management',
  'Retirement Planning',
  'Estate Planning',
  'Tax Planning',
  'Insurance Planning',
  'Financial Planning',
  'Wealth Management',
  'Portfolio Management',
  'Risk Management',
  'Business Planning'
]

export default function TeamMembers() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [advisors, setAdvisors] = useState<FinancialAdvisor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdvisor, setEditingAdvisor] = useState<FinancialAdvisor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    licenseNumber: '',
    yearsExperience: '',
    hourlyRate: '',
    bio: '',
    website: '',
    linkedinUrl: '',
    preferredContactMethod: '',
    notes: ''
  })
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [customSpecialty, setCustomSpecialty] = useState('')

  useEffect(() => {
    fetchAdvisors()
  }, [])

  const fetchAdvisors = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_advisors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdvisors(data || [])
    } catch (error) {
      console.error('Error fetching advisors:', error)
      toast({
        title: "Error",
        description: "Failed to load financial advisors",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      company: '',
      title: '',
      email: '',
      phone: '',
      licenseNumber: '',
      yearsExperience: '',
      hourlyRate: '',
      bio: '',
      website: '',
      linkedinUrl: '',
      preferredContactMethod: '',
      notes: ''
    })
    setSelectedSpecialties([])
    setCustomSpecialty('')
    setEditingAdvisor(null)
  }

  const openEditDialog = (advisor: FinancialAdvisor) => {
    setEditingAdvisor(advisor)
    setFormData({
      fullName: advisor.full_name,
      company: advisor.company || '',
      title: advisor.title || '',
      email: advisor.email || '',
      phone: advisor.phone || '',
      licenseNumber: advisor.license_number || '',
      yearsExperience: advisor.years_experience?.toString() || '',
      hourlyRate: advisor.hourly_rate?.toString() || '',
      bio: advisor.bio || '',
      website: advisor.website || '',
      linkedinUrl: advisor.linkedin_url || '',
      preferredContactMethod: advisor.preferred_contact_method || '',
      notes: advisor.notes || ''
    })
    setSelectedSpecialties(advisor.specialties || [])
    setDialogOpen(true)
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the advisor's full name.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const advisorData = {
        full_name: formData.fullName.trim(),
        company: formData.company.trim() || null,
        title: formData.title.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
        license_number: formData.licenseNumber.trim() || null,
        years_experience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        bio: formData.bio.trim() || null,
        website: formData.website.trim() || null,
        linkedin_url: formData.linkedinUrl.trim() || null,
        preferred_contact_method: formData.preferredContactMethod || null,
        notes: formData.notes.trim() || null
      }

      if (editingAdvisor) {
        // Update existing advisor
        const { error } = await supabase
          .from('financial_advisors')
          .update(advisorData)
          .eq('id', editingAdvisor.id)

        if (error) throw error

        toast({
          title: "Advisor Updated",
          description: `${formData.fullName} has been updated successfully.`
        })
      } else {
        // Add new advisor
        const { error } = await supabase
          .from('financial_advisors')
          .insert({
            ...advisorData,
            added_by: user?.id
          })

        if (error) throw error

        toast({
          title: "Advisor Added",
          description: `${formData.fullName} has been added to your team.`
        })
      }

      resetForm()
      setDialogOpen(false)
      fetchAdvisors()
    } catch (error) {
      console.error('Error saving advisor:', error)
      toast({
        title: "Error",
        description: "Failed to save advisor. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteAdvisor = async (advisor: FinancialAdvisor) => {
    if (!confirm(`Are you sure you want to remove ${advisor.full_name} from your team?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('financial_advisors')
        .delete()
        .eq('id', advisor.id)

      if (error) throw error

      toast({
        title: "Advisor Removed",
        description: `${advisor.full_name} has been removed from your team.`
      })

      fetchAdvisors()
    } catch (error) {
      console.error('Error deleting advisor:', error)
      toast({
        title: "Error",
        description: "Failed to remove advisor. Please try again.",
        variant: "destructive"
      })
    }
  }

  const canEditAdvisor = (advisor: FinancialAdvisor) => {
    return advisor.added_by === user?.id || profile?.is_admin
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your financial advisors and team members
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Financial Advisor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAdvisor ? 'Edit Financial Advisor' : 'Add Financial Advisor'}
                </DialogTitle>
                <DialogDescription>
                  {editingAdvisor ? 'Update advisor information' : 'Add a new financial advisor to your team'}
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
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Company name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Job title"
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

                {/* Professional Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Professional Information</h3>
                  
                  <div>
                    <Label>Specialties</Label>
                    <Select onValueChange={addSpecialty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialtyOptions.map((specialty) => (
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

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        placeholder="License #"
                      />
                    </div>

                    <div>
                      <Label htmlFor="yearsExperience">Years Experience</Label>
                      <Input
                        id="yearsExperience"
                        type="number"
                        value={formData.yearsExperience}
                        onChange={(e) => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                    <Select value={formData.preferredContactMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, preferredContactMethod: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Additional Information</h3>
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Brief bio or description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                      <Input
                        id="linkedinUrl"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? "Saving..." : editingAdvisor ? "Update Advisor" : "Add Advisor"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Advisors List */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-20 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : advisors.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-8">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No financial advisors added yet.</p>
                <p className="text-sm">Add your first advisor to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {advisors.map((advisor) => (
              <Card key={advisor.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(advisor.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{advisor.full_name}</CardTitle>
                        {advisor.title && advisor.company && (
                          <CardDescription>{advisor.title} at {advisor.company}</CardDescription>
                        )}
                      </div>
                    </div>
                    
                    {canEditAdvisor(advisor) && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(advisor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteAdvisor(advisor)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {advisor.specialties && advisor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {advisor.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {advisor.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{advisor.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {advisor.years_experience && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {advisor.years_experience} years
                      </div>
                    )}
                    {advisor.hourly_rate && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${advisor.hourly_rate}/hr
                      </div>
                    )}
                  </div>

                  {advisor.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {advisor.bio}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {advisor.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${advisor.email}`}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </a>
                      </Button>
                    )}
                    {advisor.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${advisor.phone}`}>
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </a>
                      </Button>
                    )}
                    {advisor.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={advisor.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-3 w-3 mr-1" />
                          Website
                        </a>
                      </Button>
                    )}
                    {advisor.linkedin_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={advisor.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-3 w-3 mr-1" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}