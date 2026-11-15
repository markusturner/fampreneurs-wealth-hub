import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { MARKUS_SKILLS, type MarkusSkill } from '@/lib/markus-skills'

export type StoredMarkusSkill = MarkusSkill & { rowId: string; sortOrder: number; isActive: boolean; ownerUserId: string | null }

// Loads the inherited skills plus the member's own skills, falling back to the built-in list if they cannot load.
export function useMarkusSkills() {
  const [skills, setSkills] = useState<StoredMarkusSkill[] | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('markus_skills').select('id,slug,title,body,prompt,sort_order,is_active,owner_user_id').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (error || !data) {
      console.error('Markus skills failed to load:', error?.message)
      setSkills(MARKUS_SKILLS.map((s, i) => ({ ...s, rowId: s.id, sortOrder: i * 10, isActive: true, ownerUserId: null })))
      return
    }
    setSkills(data.map((r) => ({ id: r.slug, rowId: r.id, title: r.title, body: r.body, prompt: r.prompt, sortOrder: r.sort_order, isActive: r.is_active, ownerUserId: (r as { owner_user_id?: string | null }).owner_user_id ?? null })))
  }, [])
  useEffect(() => { void load() }, [load])
  return { skills: skills ?? [], loaded: skills !== null, reload: load }
}
