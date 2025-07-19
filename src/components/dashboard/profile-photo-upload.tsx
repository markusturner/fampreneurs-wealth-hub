import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Upload, User } from 'lucide-react'

interface ProfilePhotoUploadProps {
  isOpen: boolean
  onClose: () => void
}

export const ProfilePhotoUpload = ({ isOpen, onClose }: ProfilePhotoUploadProps) => {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}` // Organize by user ID for RLS

      // Delete old photo if exists
      if (profile?.avatar_url) {
        try {
          // Extract the full path from the URL for deletion
          const urlParts = profile.avatar_url.split('/')
          const bucketIndex = urlParts.findIndex(part => part === 'profile-photos')
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(bucketIndex + 1).join('/')
            await supabase.storage.from('profile-photos').remove([oldPath])
          }
        } catch (error) {
          console.log('Could not delete old photo:', error)
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          profile_photo_uploaded: true
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      await refreshProfile()

      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!"
      })

      onClose()
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      toast({
        title: "Error",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        style={{
          pointerEvents: 'auto'
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px)',
            zIndex: -1
          }}
        />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Upload Profile Photo (Required)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please upload a profile photo to continue. This is required for all members.
          </p>
          
          <div className="flex justify-center">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage 
                src={previewUrl || profile?.avatar_url || undefined} 
                className="object-cover w-full h-full"
                style={{ objectFit: 'cover' }}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile?.display_name?.charAt(0) || profile?.first_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div>
            <Label htmlFor="photo-upload">Select Photo (JPG, PNG, max 5MB)</Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}