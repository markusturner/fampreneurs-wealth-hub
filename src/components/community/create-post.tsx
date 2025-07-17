import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ImagePlus, Send, Loader2 } from 'lucide-react'

interface CreatePostProps {
  onPostCreated?: () => void
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('community-images')
      .upload(fileName, file)
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('community-images')
      .getPublicUrl(fileName)
    
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && !image) {
      toast({
        title: "Error",
        description: "Please add some content or an image to share",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      let imageUrl = null
      
      if (image) {
        imageUrl = await uploadImage(image)
        if (!imageUrl) {
          toast({
            title: "Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive"
          })
          return
        }
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user?.id,
          content: content.trim(),
          image_url: imageUrl
        })

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Your post has been shared!"
      })

      // Reset form
      setContent('')
      setImage(null)
      setImagePreview(null)
      
      // Notify parent component
      onPostCreated?.()
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none"
      />
      
      {imagePreview && (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-48 rounded-lg object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              setImage(null)
              setImagePreview(null)
            }}
          >
            Remove
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              asChild
            >
              <span>
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Photo
              </span>
            </Button>
          </label>
        </div>
        
        <Button
          type="submit"
          disabled={isSubmitting || (!content.trim() && !image)}
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Share
        </Button>
      </div>
    </form>
  )
}