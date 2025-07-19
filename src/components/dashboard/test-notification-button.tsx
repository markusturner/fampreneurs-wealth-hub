import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"

export function TestNotificationButton() {
  const { user } = useAuth()

  const createTestNotification = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('family_notifications')
        .insert({
          user_id: user.id,
          notification_type: 'meeting_scheduled',
          title: 'Test Meeting Notification',
          message: `Test notification created at ${new Date().toLocaleTimeString()}`,
          meeting_date: '2024-12-25',
          meeting_time: '14:00'
        })

      if (error) throw error

      toast({
        title: "Test Notification Created",
        description: "Check the notification bell to see the test notification."
      })
    } catch (error) {
      console.error('Error creating test notification:', error)
      toast({
        title: "Error",
        description: "Failed to create test notification.",
        variant: "destructive"
      })
    }
  }

  const createTestFamilyMember = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('family_members')
        .insert({
          full_name: 'Test Family Member',
          email: 'test@example.com',
          family_position: 'Child',
          added_by: user.id,
          status: 'active'
        })

      if (error) throw error

      toast({
        title: "Test Family Member Added",
        description: "Now when you schedule meetings, notifications will be created."
      })
    } catch (error) {
      console.error('Error creating test family member:', error)
      toast({
        title: "Error",
        description: "Failed to create test family member.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium text-sm mb-2">Testing Notifications</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use these buttons to test the notification system
        </p>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={createTestNotification}
          >
            Create Test Notification
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={createTestFamilyMember}
          >
            Add Test Family Member
          </Button>
        </div>
      </div>
    </div>
  )
}