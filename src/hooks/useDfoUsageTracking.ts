import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

/** Logs how long a user spends in each Digital Family Office section. */
export function useDfoUsageTracking(userId: string | undefined, section: string, subSection?: string | null) {
  const startRef = useRef(Date.now())
  useEffect(() => {
    if (!userId) return
    startRef.current = Date.now()
    const flush = () => {
      const seconds = Math.round((Date.now() - startRef.current) / 1000)
      startRef.current = Date.now()
      if (seconds < 2) return
      ;(supabase as any).from('dfo_usage_events')
        .insert({ user_id: userId, section, sub_section: subSection ?? null, seconds: Math.min(seconds, 3600) })
        .then(() => {})
    }
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); else startRef.current = Date.now() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); flush() }
  }, [userId, section, subSection])
}
