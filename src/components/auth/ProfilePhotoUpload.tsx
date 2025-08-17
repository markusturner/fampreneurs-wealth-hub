import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, Scissors, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { pipeline, env } from '@huggingface/transformers'

// Configure transformers.js
env.allowLocalModels = false
env.useBrowserCache = false

const MAX_IMAGE_DIMENSION = 1024

interface ProfilePhotoUploadProps {
  onPhotoSelected: (file: File, url: string) => void
  currentPhotoUrl?: string
}

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth
  let height = image.naturalHeight

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width)
      width = MAX_IMAGE_DIMENSION
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height)
      height = MAX_IMAGE_DIMENSION
    }

    canvas.width = width
    canvas.height = height
    ctx.drawImage(image, 0, 0, width, height)
    return true
  }

  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0)
  return false
}

const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting background removal process...')
    const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    })
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) throw new Error('Could not get canvas context')
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement)
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`)
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    console.log('Image converted to base64')
    
    // Process the image with the segmentation model
    console.log('Processing with segmentation model...')
    const result = await segmenter(imageData)
    
    console.log('Segmentation result:', result)
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result')
    }
    
    // Create a new canvas for the masked image
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = canvas.width
    outputCanvas.height = canvas.height
    const outputCtx = outputCanvas.getContext('2d')
    
    if (!outputCtx) throw new Error('Could not get output canvas context')
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0)
    
    // Apply the mask
    const outputImageData = outputCtx.getImageData(
      0, 0,
      outputCanvas.width,
      outputCanvas.height
    )
    const data = outputImageData.data
    
    // Apply inverted mask to alpha channel
    for (let i = 0; i < result[0].mask.data.length; i++) {
      // Invert the mask value (1 - value) to keep the subject instead of the background
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255)
      data[i * 4 + 3] = alpha
    }
    
    outputCtx.putImageData(outputImageData, 0, 0)
    console.log('Mask applied successfully')
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created final blob')
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        'image/png',
        1.0
      )
    })
  } catch (error) {
    console.error('Error removing background:', error)
    throw error
  }
}

const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function ProfilePhotoUpload({ onPhotoSelected, currentPhotoUrl }: ProfilePhotoUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create preview URL immediately
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Call parent callback with original file
      onPhotoSelected(file, url)
      
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been selected.",
      })
    } catch (error) {
      console.error('Error processing image:', error)
      toast({
        title: "Upload failed",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveBackground = async () => {
    if (!previewUrl) return

    setIsProcessing(true)
    try {
      // Convert current preview to file
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const img = await loadImage(blob)
      
      // Remove background
      const processedBlob = await removeBackground(img)
      
      // Create new file from processed blob
      const processedFile = new File([processedBlob], 'profile-photo.png', {
        type: 'image/png'
      })
      
      // Update preview
      const newUrl = URL.createObjectURL(processedBlob)
      setPreviewUrl(newUrl)
      
      // Call parent callback with processed file
      onPhotoSelected(processedFile, newUrl)
      
      toast({
        title: "Background removed",
        description: "Your profile photo background has been removed.",
      })
    } catch (error) {
      console.error('Error removing background:', error)
      toast({
        title: "Background removal failed",
        description: "Failed to remove background. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="profile-photo">Profile Photo</Label>
      <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex flex-col items-center space-y-4">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-border"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex flex-col gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileSelect}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {previewUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              
              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveBackground}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Scissors className="h-4 w-4 mr-2" />
                  )}
                  Remove Background
                </Button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="profile-photo"
            />
            
            <p className="text-xs text-muted-foreground text-center">
              Upload a photo (JPG, PNG, max 5MB)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
