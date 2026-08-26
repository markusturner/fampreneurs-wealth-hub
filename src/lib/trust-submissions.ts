import { supabase } from "@/integrations/supabase/client"

export interface TrustSubmissionRecord {
  id: string
  form_data: any
  submitter_name?: string | null
  created_at?: string
}

/** Get the user's most recent submission for a given trust form type. */
export async function fetchLatestSubmission(
  userId: string,
  trustType: string
): Promise<TrustSubmissionRecord | null> {
  const { data, error } = await supabase
    .from("trust_submissions")
    .select("id, form_data, submitter_name, created_at")
    .eq("user_id", userId)
    .eq("trust_type", trustType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to load previous submission", error)
    return null
  }
  return (data as any) ?? null
}

/**
 * Save a form. If the user already submitted this form type, the existing
 * record is updated (edit) instead of creating a duplicate.
 */
export async function saveTrustSubmission(params: {
  userId: string
  trustType: string
  formData: any
  submitterName?: string
}): Promise<{ id: string; updated: boolean }> {
  const { userId, trustType, formData, submitterName } = params
  const existing = await fetchLatestSubmission(userId, trustType)

  if (existing?.id) {
    const payload: Record<string, any> = { form_data: formData }
    if (submitterName !== undefined) payload.submitter_name = submitterName
    const { error } = await supabase
      .from("trust_submissions")
      .update(payload as any)
      .eq("id", existing.id)
      .eq("user_id", userId)
    if (error) throw error
    return { id: existing.id, updated: true }
  }

  const insertPayload: Record<string, any> = {
    user_id: userId,
    trust_type: trustType,
    form_data: formData,
  }
  if (submitterName !== undefined) insertPayload.submitter_name = submitterName

  const { data, error } = await supabase
    .from("trust_submissions")
    .insert(insertPayload as any)
    .select("id")
    .single()
  if (error) throw error
  return { id: (data as any).id, updated: false }
}
