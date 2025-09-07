import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface TrialData {
  trial_start_date: string | null
  trial_end_date: string | null
  trial_days_remaining: number
  early_payment_date: string | null
  community_join_date: string | null
}

export function useTrialManagement() {
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchTrialData = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('trial_start_date, trial_end_date, trial_days_remaining, early_payment_date, community_join_date')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching trial data:', error)
        return
      }

      setTrialData(data || null)
    } catch (error) {
      console.error('Error in fetchTrialData:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTrialPeriod = async (days: number) => {
    if (!user?.email) return false

    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(startDate.getDate() + days)

      const { error } = await supabase
        .from('subscribers')
        .upsert({
          user_id: user.id,
          email: user.email,
          trial_start_date: startDate.toISOString(),
          trial_end_date: endDate.toISOString(),
          trial_days_remaining: days,
        })

      if (error) throw error

      await fetchTrialData()
      return true
    } catch (error) {
      console.error('Error updating trial period:', error)
      return false
    }
  }

  const markEarlyPayment = async () => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          early_payment_date: new Date().toISOString(),
          trial_end_date: new Date().toISOString(),
          trial_days_remaining: 0,
        })
        .eq('user_id', user.id)

      if (error) throw error

      await fetchTrialData()
      return true
    } catch (error) {
      console.error('Error marking early payment:', error)
      return false
    }
  }

  const calculateDaysRemaining = () => {
    if (!trialData?.trial_end_date) return 0
    
    const endDate = new Date(trialData.trial_end_date)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  useEffect(() => {
    fetchTrialData()
  }, [user])

  return {
    trialData,
    loading,
    updateTrialPeriod,
    markEarlyPayment,
    calculateDaysRemaining,
    refreshTrialData: fetchTrialData
  }
}