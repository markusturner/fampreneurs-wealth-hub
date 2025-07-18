import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Upload, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface AddCoachDialogProps {
  onCoachAdded: () => void
}

export function AddCoachDialog({ onCoachAdded }: AddCoachDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    specialties: '',
    hourly_rate: '',
    years_experience: ''
  })
  const { toast } = useToast()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null
    
    setUploading(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('coach-photos')
        .upload(fileName, avatarFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('coach-photos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload avatar if selected
      const avatarUrl = await uploadAvatar()
      
      const { error } = await supabase
        .from('coaches')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: avatarUrl,
          specialties: formData.specialties.split(',').map(s => s.trim()),
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          added_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error

      toast({
        title: "Coach added successfully",
        description: "The new coach has been added to the system.",
      })

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        bio: '',
        specialties: '',
        hourly_rate: '',
        years_experience: ''
      })
      setAvatarFile(null)
      setAvatarPreview('')
      setOpen(false)
      onCoachAdded()
    } catch (error: any) {
      toast({
        title: "Error adding coach",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Coach</DialogTitle>
          <DialogDescription>
            Add a new coach to the system who can provide 1-on-1 sessions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload Section */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center space-x-4">
              {avatarPreview ? (
                <div className="relative">
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarPreview('')
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>Choose Photo</span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB • JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialties">Specialties (comma separated)</Label>
            <Input
              id="specialties"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="Estate Planning, Tax Strategy, Investment Management"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="years_experience">Years Experience</Label>
              <Input
                id="years_experience"
                type="number"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading ? 'Creating...' : 'Add Coach'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}