import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, User } from 'lucide-react'

export default function ProfilePhotoUploadPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // If profile photo already uploaded and user is not admin, skip to community
  useEffect(() => {
    if (!authLoading && user && profile?.profile_photo_uploaded && !profile?.is_admin) {
      window.location.href = '/community'
    }
  }, [authLoading, user, profile])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      if (profile?.avatar_url) {
        try {
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
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, profile_photo_uploaded: true })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      await refreshProfile()

      toast({ title: "Success", description: "Profile photo uploaded successfully!" })
      window.location.href = '/community'
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      toast({ title: "Error", description: "Failed to upload profile photo. Please try again.", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg border border-border p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Upload Profile Photo</h1>
          <p className="text-sm text-muted-foreground">
            Please upload a profile photo to continue. This is required for all members.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative w-32 h-32 border-4 border-primary/20 rounded-full overflow-hidden">
            {previewUrl || profile?.avatar_url ? (
              <img
                src={previewUrl || profile?.avatar_url || undefined}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-2xl">
                {profile?.display_name?.charAt(0) || profile?.first_name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="photo-upload">Select Photo (JPG, PNG, max 5MB)</Label>
          <Input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
            className="mt-1 file:bg-[#ffb500] file:text-[#290a52] file:border-0 file:rounded-md file:px-3 file:py-1 file:font-medium file:cursor-pointer file:hover:bg-[#2eb2ff] file:transition-colors"
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
          style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Photo & Continue'}
        </Button>
      </div>
    </div>
  )
}
