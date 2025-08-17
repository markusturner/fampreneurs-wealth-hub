import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface Meeting {
  id: string
  title: string
  date: string
  time: string
  type: string
  notes?: string
  user_id?: string
}

interface MeetingsContextType {
  meetings: Meeting[]
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void
  loading: boolean
}

const MeetingsContext = createContext<MeetingsContextType | undefined>(undefined)

const initialMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Family Investment Review',
    date: '2024-12-20',
    time: '10:00',
    type: 'Quarterly Reviews'
  }
]

export function MeetingsProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use a try-catch to handle cases where AuthProvider isn't ready
  let user = null
  try {
    const auth = useAuth()
    user = auth.user
  } catch (error) {
    // AuthProvider not ready yet, user will be null
    console.log('AuthProvider not ready yet, will retry when available')
  }

  // Load meetings from user's localStorage and database
  useEffect(() => {
    if (user) {
      loadMeetings()
    }
  }, [user])

  const loadMeetings = async () => {
    if (!user) return

    try {
      // For now, we'll use localStorage since we don't have a meetings table yet
      // but we'll include the user_id in the key for user-specific data
      const storedMeetings = localStorage.getItem(`meetings_${user.id}`)
      if (storedMeetings) {
        setMeetings(JSON.parse(storedMeetings))
      } else {
        // Set initial meetings for this user
        const userInitialMeetings = initialMeetings.map(meeting => ({
          ...meeting,
          user_id: user.id
        }))
        setMeetings(userInitialMeetings)
        localStorage.setItem(`meetings_${user.id}`, JSON.stringify(userInitialMeetings))
      }
    } catch (error) {
      console.error('Error loading meetings:', error)
      setMeetings(initialMeetings)
    } finally {
      setLoading(false)
    }
  }

  const addMeeting = async (meetingData: Omit<Meeting, 'id'>) => {
    if (!user) {
      console.log('MeetingsContext: No user found when adding meeting')
      return
    }

    console.log('MeetingsContext: Adding meeting for user:', user.id, meetingData)

    const newMeeting: Meeting = {
      ...meetingData,
      id: Date.now().toString(),
      user_id: user.id
    }

    try {
      // Update local state
      const updatedMeetings = [...meetings, newMeeting]
      setMeetings(updatedMeetings)
      
      // Save to localStorage
      localStorage.setItem(`meetings_${user.id}`, JSON.stringify(updatedMeetings))

      console.log('MeetingsContext: About to call notify_family_members_about_meeting')
      
      // Notify family members about the new meeting
      const { data, error } = await supabase.rpc('notify_family_members_about_meeting', {
        meeting_title: meetingData.title,
        meeting_date: meetingData.date,
        meeting_time: meetingData.time,
        meeting_id: newMeeting.id,
        creator_user_id: user.id
      })

      if (error) {
        console.error('MeetingsContext: Error sending notifications:', error)
      } else {
        console.log(`MeetingsContext: Notifications sent to ${data} family members`)
      }
    } catch (error) {
      console.error('MeetingsContext: Error adding meeting:', error)
    }
  }

  return (
    <MeetingsContext.Provider value={{ meetings, addMeeting, loading }}>
      {children}
    </MeetingsContext.Provider>
  )
}

export function useMeetings() {
  const context = useContext(MeetingsContext)
  if (context === undefined) {
    throw new Error('useMeetings must be used within a MeetingsProvider')
  }
  return context
}