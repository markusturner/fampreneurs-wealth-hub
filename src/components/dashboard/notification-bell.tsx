import { useState } from "react"
import { Bell, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { FeedbackDialog } from "@/components/dashboard/feedback-dialog"
import { WeeklyCheckinDialog } from "@/components/dashboard/weekly-checkin-dialog"
import { TutorialVideoModal } from "@/components/dashboard/tutorial-video-modal"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [weeklyCheckinDialogOpen, setWeeklyCheckinDialogOpen] = useState(false)
  const [tutorialVideoOpen, setTutorialVideoOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { user } = useAuth()

  const handleNotificationClick = async (notification: any) => {
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
    } else if (notification.notification_type === 'tutorial_reminder') {
      setTutorialVideoOpen(true)
    } else if (notification.notification_type === 'video_call_started') {
      window.location.href = '/community'
    } else if (notification.notification_type === 'family_message') {
      window.location.href = '/community'
    } else if (notification.notification_type === 'group_message') {
      window.location.href = '/community'
    } else if (notification.notification_type === 'message') {
      window.location.href = '/community'
    } else if (notification.notification_type === 'meeting_scheduled') {
      window.location.href = '/calendar'
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 hover:bg-sidebar-accent/60 rounded-lg",
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
                      {notification.notification_type === 'tutorial_reminder' ? (
                        <Video className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                      ) : !notification.is_read ? (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 animate-pulse flex-shrink-0" />
                      ) : null}
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
      {user && (
        <TutorialVideoModal
          isOpen={tutorialVideoOpen}
          onClose={() => setTutorialVideoOpen(false)}
          onWatched={() => {}}
          onSkipped={() => {}}
          userId={user.id}
        />
      )}
    </Popover>
  )
}