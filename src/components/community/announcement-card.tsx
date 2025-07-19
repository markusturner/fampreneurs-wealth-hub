import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Edit2, Trash2, Clock, Save, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  created_at: string
  created_by: string
  expires_at: string | null
  profiles: {
    display_name: string | null
    first_name: string | null
  } | null
}

interface AnnouncementCardProps {
  announcement: Announcement
  onUpdate: () => void
}

export const AnnouncementCard = ({ announcement, onUpdate }: AnnouncementCardProps) => {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(announcement.title)
  const [editContent, setEditContent] = useState(announcement.content)
  const [editIsPinned, setEditIsPinned] = useState(announcement.is_pinned)
  const [editExpiresAt, setEditExpiresAt] = useState(
    announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
  )
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = profile?.is_admin
  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date()

  const getDisplayName = (profiles: Announcement['profiles']) => {
    if (!profiles) return 'Unknown User'
    return profiles.display_name || profiles.first_name || 'Unknown User'
  }

  const handleEdit = () => {
    setEditTitle(announcement.title)
    setEditContent(announcement.content)
    setEditIsPinned(announcement.is_pinned)
    setEditExpiresAt(announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    try {
      const updateData: any = {
        title: editTitle.trim(),
        content: editContent.trim(),
        is_pinned: editIsPinned
      }

      if (editExpiresAt) {
        updateData.expires_at = new Date(editExpiresAt).toISOString()
      } else {
        updateData.expires_at = null
      }

      const { error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', announcement.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Announcement updated successfully!"
      })

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating announcement:', error)
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Announcement deleted successfully!"
      })

      onUpdate()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditTitle(announcement.title)
    setEditContent(announcement.content)
    setEditIsPinned(announcement.is_pinned)
    setEditExpiresAt(announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '')
  }

  if (isExpired) {
    return null // Don't render expired announcements
  }

  return (
    <>
      <div className={`p-3 rounded-lg space-y-2 relative ${isEditing ? 'border-2 border-primary' : ''}`} style={{ backgroundColor: 'white' }}>
        {announcement.is_pinned && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            Pinned
          </Badge>
        )}
        
        {isEditing ? (
          <div className="space-y-3 pt-6">
            <div>
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Announcement title"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Announcement content (photos and videos can be added using URLs)"
                rows={4}
              />
            </div>
            <div>
              <Label>Media URL (Optional)</Label>
              <Input
                placeholder="Add image or video URL (https://...)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add photos or videos by pasting their URLs
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editIsPinned}
                onCheckedChange={setEditIsPinned}
              />
              <Label>Pin to top</Label>
            </div>
            <div>
              <Label>Expires At (Optional)</Label>
              <Input
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                <Save className="h-3 w-3 mr-1" />
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm line-clamp-2 pr-4" style={{ color: '#290a52' }}>
                {announcement.title}
              </h4>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={handleEdit}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: '#290a52' }}>
              {announcement.content}
            </p>
            <div className="flex items-center justify-between text-xs" style={{ color: '#290a52' }}>
              <span className="truncate">
                by {getDisplayName(announcement.profiles)}
              </span>
              <div className="flex items-center gap-2">
                {announcement.expires_at && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-3 w-3" />
                    <span>Expires {new Date(announcement.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
                <span>
                  {new Date(announcement.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}