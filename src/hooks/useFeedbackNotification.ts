import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useFeedbackNotification() {
  const { user } = useAuth()
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFeedbackStatus = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Check if user needs to provide feedback
      const { data: needsFeedback, error } = await supabase
        .rpc('user_needs_feedback_notification', { target_user_id: user.id })

      if (error) {
        console.error('Error checking feedback status:', error)
        return
      }

      setShouldShowFeedback(needsFeedback)
    } catch (error) {
      console.error('Error checking feedback status:', error)
    } finally {
      setLoading(false)
    }
  }

  const markFeedbackShown = () => {
    setShouldShowFeedback(false)
  }

  useEffect(() => {
    if (user?.id) {
      // Check on initial load
      checkFeedbackStatus()

      // Set up a timer to check periodically (every hour)
      const interval = setInterval(checkFeedbackStatus, 60 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user?.id])

  return {
    shouldShowFeedback,
    loading,
    checkFeedbackStatus,
    markFeedbackShown
  }
}