import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Paperclip, Image, Video, Mic, X, Upload } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FileUploadProps {
  onFileUploaded: (file: {
    url: string
    type: string
    name: string
    size: number
  }) => void
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File, type: string) => {
    if (!user || !file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName)

      onFileUploaded({
        url: publicUrl,
        type,
        name: file.name,
        size: file.size
      })

      toast({
        title: "Success",
        description: "File uploaded successfully",
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadFile(file, type)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileSelect = (accept: string, type: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (e) => handleFileSelect(e as any, type)
    input.click()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={uploading}
            className="h-8 w-8 p-0"
          >
            {uploading ? (
              <Upload className="h-4 w-4 animate-pulse" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top">
          <DropdownMenuItem onClick={() => triggerFileSelect('image/*', 'image')}>
            <Image className="h-4 w-4 mr-2" />
            Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerFileSelect('video/*', 'video')}>
            <Video className="h-4 w-4 mr-2" />
            Video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerFileSelect('audio/*', 'audio')}>
            <Mic className="h-4 w-4 mr-2" />
            Audio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerFileSelect('*', 'document')}>
            <Paperclip className="h-4 w-4 mr-2" />
            Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />
    </>
  )
}