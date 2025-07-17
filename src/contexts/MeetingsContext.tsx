import React, { createContext, useContext, useState } from 'react'

export interface Meeting {
  id: string
  title: string
  date: string
  time: string
  type: string
  notes?: string
}

interface MeetingsContextType {
  meetings: Meeting[]
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void
}

const MeetingsContext = createContext<MeetingsContextType | undefined>(undefined)

const initialMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Family Investment Review',
    date: '2024-12-20',
    time: '10:00',
    type: 'Investment Review'
  },
  {
    id: '2',
    title: 'Estate Planning Discussion',
    date: '2024-12-22',
    time: '14:30',
    type: 'Estate Planning'
  },
  {
    id: '3',
    title: 'Quarterly Family Meeting',
    date: '2024-12-28',
    time: '16:00',
    type: 'General Meeting'
  }
]

export function MeetingsProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)

  const addMeeting = (meetingData: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...meetingData,
      id: Date.now().toString()
    }
    setMeetings(prev => [...prev, newMeeting])
  }

  return (
    <MeetingsContext.Provider value={{ meetings, addMeeting }}>
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