import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Send, Megaphone } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function AdminMassNotification() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { toast } = useToast()

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message",
        variant: "destructive"
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmAndSend = async () => {
    setShowConfirmDialog(false)
    setIsLoading(true)

    try {
      // Call edge function to send mass notification
      const { data, error } = await supabase.functions.invoke('send-mass-notification', {
        body: {
          title: title.trim(),
          message: message.trim(),
          notificationType: 'system_update'
        }
      })

      if (error) {
        throw error
      }

      toast({
        title: "Success!",
        description: `Notification sent to ${data.userCount || 'all'} users`
      })

      // Clear form
      setTitle('')
      setMessage('')

    } catch (error: any) {
      console.error('Error sending mass notification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send notification. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" style={{ color: '#ffb500' }} />
            <CardTitle>Mass Notification</CardTitle>
          </div>
          <CardDescription>
            Send a notification to all users about software updates or important announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-title">Notification Title</Label>
            <Input
              id="notification-title"
              placeholder="e.g., New Feature Available!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-message">Message</Label>
            <Textarea
              id="notification-message"
              placeholder="Describe the update or announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This will be sent to all users in the system
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSendNotification}
              disabled={isLoading || !title.trim() || !message.trim()}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to All Users
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Preview:</h4>
            <div className="bg-background rounded-lg p-3 border">
              <p className="font-semibold text-sm">{title || 'Notification Title'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {message || 'Your message will appear here...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Mass Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a notification to ALL users in the system. This action cannot be undone.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm text-foreground">Title: {title}</p>
                <p className="text-sm text-muted-foreground mt-1">Message: {message}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndSend}>
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
