import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Clock, CheckCircle, XCircle, Timer } from 'lucide-react'

interface AttendanceTrackerProps {
  sessionId: string
  sessionType: 'group' | 'individual'
  sessionTitle: string
  onAttendanceUpdate?: () => void
  meetingUrl?: string
}

export const AttendanceTracker = ({ 
  sessionId, 
  sessionType, 
  sessionTitle, 
  onAttendanceUpdate,
  meetingUrl 
}: AttendanceTrackerProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [attendance, setAttendance] = useState<any>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    if (user) {
      fetchAttendance()
    }
  }, [user, sessionId])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const fetchAttendance = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .eq('session_type', sessionType)
        .maybeSingle()

      if (error) throw error
      setAttendance(data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const handleJoinSession = async () => {
    if (!user) return

    setIsJoining(true)
    try {
      const joinTime = new Date()
      
      const { error } = await supabase
        .from('session_attendance')
        .upsert({
          user_id: user.id,
          session_id: sessionId,
          session_type: sessionType,
          attended: true,
          joined_at: joinTime.toISOString()
        })

      if (error) throw error

      toast({
        title: "Session Joined",
        description: `You've joined the ${sessionType} session successfully!`
      })

      fetchAttendance()
      if (onAttendanceUpdate) onAttendanceUpdate()
    } catch (error) {
      console.error('Error joining session:', error)
      toast({
        title: "Error",
        description: "Failed to record session attendance",
        variant: "destructive"
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveSession = async () => {
    if (!user || !attendance) return

    setIsLeaving(true)
    try {
      const leaveTime = new Date()
      const joinTime = new Date(attendance.joined_at)
      const durationMinutes = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60))

      const { error } = await supabase
        .from('session_attendance')
        .update({
          left_at: leaveTime.toISOString(),
          attendance_duration_minutes: durationMinutes
        })
        .eq('id', attendance.id)

      if (error) throw error

      toast({
        title: "Session Left",
        description: `You attended for ${durationMinutes} minutes. Great job!`
      })

      fetchAttendance()
      if (onAttendanceUpdate) onAttendanceUpdate()
    } catch (error) {
      console.error('Error leaving session:', error)
      toast({
        title: "Error", 
        description: "Failed to update attendance record",
        variant: "destructive"
      })
    } finally {
      setIsLeaving(false)
    }
  }

  const getCurrentSessionDuration = () => {
    if (!attendance?.joined_at) return 0
    const joinTime = new Date(attendance.joined_at)
    return Math.round((currentTime.getTime() - joinTime.getTime()) / (1000 * 60))
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const isCurrentlyAttending = attendance?.joined_at && !attendance?.left_at

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 text-center">
        <CardTitle className="text-sm flex items-center justify-center gap-2">
          <Timer className="h-4 w-4" />
          Session Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground text-center">
          {sessionTitle}
        </div>
        
        {attendance ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status:</span>
              <Badge variant={isCurrentlyAttending ? "default" : "secondary"}>
                {isCurrentlyAttending ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Attending
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Completed
                  </div>
                )}
              </Badge>
            </div>
            
            {attendance.joined_at && (
              <div className="text-xs text-muted-foreground">
                Joined: {new Date(attendance.joined_at).toLocaleTimeString()}
              </div>
            )}
            
            {attendance.left_at && (
              <div className="text-xs text-muted-foreground">
                Left: {new Date(attendance.left_at).toLocaleTimeString()}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Duration:</span>
              <span className="text-sm font-medium">
                {isCurrentlyAttending 
                  ? formatDuration(getCurrentSessionDuration())
                  : formatDuration(attendance.attendance_duration_minutes || 0)
                }
              </span>
            </div>
            
            {isCurrentlyAttending && (
              <Button
                onClick={handleLeaveSession}
                disabled={isLeaving}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isLeaving ? 'Leaving...' : 'Leave Session'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground text-center">
              Track your attendance for this session
            </div>
            <Button
              onClick={() => {
                handleJoinSession()
                if (meetingUrl) {
                  window.open(meetingUrl, '_blank')
                }
              }}
              disabled={isJoining}
              size="sm"
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              {isJoining ? 'Joining...' : 'Join Session'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}