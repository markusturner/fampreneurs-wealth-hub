import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Megaphone, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CreateAnnouncementProps {
  onAnnouncementCreated?: () => void
}

export const CreateAnnouncement = ({ onAnnouncementCreated }: CreateAnnouncementProps) => {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Check if user is admin
  const isAdmin = profile?.is_admin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create announcements",
        variant: "destructive"
      })
      return
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Error", 
        description: "Please fill in both title and content",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          is_pinned: isPinned
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Announcement created successfully!"
      })

      // Reset form
      setTitle('')
      setContent('')
      setIsPinned(false)
      setDialogOpen(false)
      
      // Notify parent to refresh
      if (onAnnouncementCreated) {
        onAnnouncementCreated()
      }
    } catch (error) {
      console.error('Error creating announcement:', error)
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Don't render if user is not admin
  if (!isAdmin) {
    return null
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Create New Announcement
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="announcement-title">Title</Label>
            <Input
              id="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="announcement-content">Content</Label>
            <Textarea
              id="announcement-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement content"
              rows={4}
              required
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="pin-announcement"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
            <Label htmlFor="pin-announcement">Pin to top</Label>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isCreating || !title.trim() || !content.trim()}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Announcement'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}