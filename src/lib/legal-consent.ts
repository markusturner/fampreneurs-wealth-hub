import { supabase } from '@/integrations/supabase/client'
import { LEGAL_DOCUMENT_VERSION, SMS_CONSENT_TEXT } from '@/lib/legal'

export const legalAcceptedKey = (userId: string) => `legal_consent_${LEGAL_DOCUMENT_VERSION}_${userId}`

/** Saves the versioned Terms, age, email and text consents shared by every account-creation path. */
export async function recordLegalConsent(opts: { userId: string; birthDate: string; marketing: boolean; sms: boolean; phone: string; source: string }) {
  const { userId, birthDate, marketing, sms, phone, source } = opts
  const base = { user_id: userId, document_version: LEGAL_DOCUMENT_VERSION, source, user_agent: navigator.userAgent, metadata: {} }
  const { error } = await supabase.from('legal_consents').insert([
    { ...base, consent_type: 'terms_privacy', granted: true },
    { ...base, consent_type: 'age_18_plus', granted: true, metadata: { birth_date: birthDate } },
    { ...base, consent_type: 'email_marketing', granted: marketing },
    { ...base, consent_type: 'sms', granted: sms, metadata: sms ? { phone, disclosure: SMS_CONSENT_TEXT } : {} },
  ])
  if (error) return false
  await supabase.from('communication_preferences').upsert({
    user_id: userId, email_marketing: marketing, sms_enabled: sms, sms_phone: sms ? phone : null, updated_at: new Date().toISOString(),
  })
  localStorage.setItem(legalAcceptedKey(userId), '1')
  return true
}

export async function hasAcceptedTerms(userId: string): Promise<boolean> {
  if (localStorage.getItem(legalAcceptedKey(userId)) === '1') return true
  const { data } = await supabase.from('legal_consents').select('id')
    .eq('user_id', userId).eq('consent_type', 'terms_privacy')
    .eq('document_version', LEGAL_DOCUMENT_VERSION).eq('granted', true).limit(1)
  if (data?.length) localStorage.setItem(legalAcceptedKey(userId), '1')
  return !!data?.length
}
