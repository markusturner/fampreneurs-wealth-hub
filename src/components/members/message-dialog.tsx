import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from '@/hooks/use-toast'
import { Loader2, Send } from 'lucide-react'

interface MessageDialogProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  family_role: string | null
}

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: MessageDialogProfile
  onMessageSent: () => void
}

export function MessageDialog({ open, onOpenChange, recipient, onMessageSent }: MessageDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getDisplayName = (member: MessageDialogProfile) => {
    return member.display_name || 
           (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : 
           member.first_name || 'Family Member')
  }

  const getInitials = (member: MessageDialogProfile) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`
    }
    if (member.display_name) {
      const names = member.display_name.split(' ')
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`
        : names[0].charAt(0)
    }
    return 'U'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: recipient.user_id,
          subject: subject.trim() || null,
          content: content.trim()
        })

      if (error) {
        throw error
      }

      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${getDisplayName(recipient)}`
      })

      // Reset form
      setSubject('')
      setContent('')
      
      onMessageSent()
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {getInitials(recipient)}
              </AvatarFallback>
            </Avatar>
            Send Message to {getDisplayName(recipient)}
          </DialogTitle>
          <DialogDescription>
            Send a personal message to {getDisplayName(recipient)}{recipient.family_role && ` (${recipient.family_role})`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              required
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/500 characters
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !content.trim()}
              className="w-full sm:w-auto gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}