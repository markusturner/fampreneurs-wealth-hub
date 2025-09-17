import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog"
import { WeeklyCheckinDialog } from "@/components/dashboard/weekly-checkin-dialog"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [weeklyCheckinDialogOpen, setWeeklyCheckinDialogOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { user } = useAuth()
  const { toast } = useToast()
  const [friendRequests, setFriendRequests] = useState<Array<{ id: string; requester_id: string; created_at: string; profile?: { display_name: string | null; first_name: string | null; avatar_url: string | null } }>>([])

  const fetchFriendRequests = async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching friend requests:', error)
      return
    }

    const withProfiles = await Promise.all(
      (data || []).map(async (req: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name, avatar_url')
          .eq('user_id', req.requester_id)
          .maybeSingle()
        return { ...req, profile: profile || null }
      })
    )

    setFriendRequests(withProfiles as any)
  }

  useEffect(() => {
    if (open) fetchFriendRequests()
  }, [open, user?.id])

  console.log('NotificationBell: notifications:', notifications)
  console.log('NotificationBell: unreadCount:', unreadCount)

  const handleNotificationClick = async (notification: any) => {
    console.log('Clicking notification:', notification.id, 'type:', notification.notification_type)
    
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Close the notification popover
    setOpen(false)

    // Open the appropriate dialog based on notification type
    if (notification.notification_type === 'satisfaction_survey') {
      setFeedbackDialogOpen(true)
    } else if (notification.notification_type === 'weekly_checkin') {
      setWeeklyCheckinDialogOpen(true)
    } else if (notification.notification_type === 'video_call_started') {
      // For video call notifications, navigate to the community page where the call banner appears
      window.location.href = '/community'
    } else if (notification.notification_type === 'family_message') {
      // Navigate to family messages section
      window.location.href = '/community'
    } else if (notification.notification_type === 'group_message') {
      // Navigate to community for group messages
      window.location.href = '/community'
    } else if (notification.notification_type === 'message') {
      // Navigate to community for general messages (family office)
      window.location.href = '/community'
    }
  }

  const handleRequestAction = async (id: string, requesterId: string, action: 'accept' | 'decline') => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: action === 'accept' ? 'accepted' : 'declined' })
        .eq('id', id)

      if (error) throw error

      await supabase
        .from('notifications')
        .delete()
        .eq('reference_id', id)
        .eq('notification_type', 'friend_request')

      if (action === 'accept') {
        await supabase.from('notifications').insert({
          user_id: requesterId,
          sender_id: user?.id,
          notification_type: 'friend_request_accepted',
          title: 'Friend Request Accepted',
          message: 'Your friend request was accepted',
          reference_id: id
        })
      }

      setFriendRequests((prev) => prev.filter((r) => r.id !== id))
      toast({ title: action === 'accept' ? 'Friend request accepted' : 'Friend request declined' })
    } catch (e) {
      console.error('Error updating friendship:', e)
      toast({ title: 'Error', description: 'Failed to update friend request.', variant: 'destructive' })
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            unreadCount > 0 && "animate-pulse ring-2 ring-primary/20"
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-scale-in"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 group",
                    !notification.is_read && "bg-primary/5 border border-primary/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 animate-pulse flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {new Date(notification.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {notification.is_read && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteNotification(notification.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                        title="Delete notification"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Birthdays */}
          <div className="p-4 border-t">
            <h3 className="font-semibold text-foreground mb-3">Birthdays</h3>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <div className="w-8 h-8 flex items-center justify-center">
                <span className="text-lg">🎁</span>
              </div>
              <span className="text-sm">3 members have birthdays today</span>
            </div>
          </div>

          {/* Friend Requests */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Friend requests</h3>
              <span className="text-sm text-muted-foreground">{friendRequests.length} pending</span>
            </div>
            <div className="space-y-3">
              {friendRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              ) : (
                friendRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={req.profile?.avatar_url || undefined} alt={(req.profile?.display_name || req.profile?.first_name || 'Member') + ' avatar'} />
                      <AvatarFallback>
                        {(req.profile?.display_name || req.profile?.first_name || 'M').slice(0,1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {req.profile?.display_name || req.profile?.first_name || 'Member'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequestAction(req.id, req.requester_id, 'accept') }}
                        className="px-4 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequestAction(req.id, req.requester_id, 'decline') }}
                        className="px-4 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
      
      {/* Dialogs */}
      <FeedbackDialog 
        open={feedbackDialogOpen} 
        onOpenChange={setFeedbackDialogOpen}
      />
      <WeeklyCheckinDialog 
        open={weeklyCheckinDialogOpen} 
        onOpenChange={setWeeklyCheckinDialogOpen}
      />
    </Popover>
  )
}