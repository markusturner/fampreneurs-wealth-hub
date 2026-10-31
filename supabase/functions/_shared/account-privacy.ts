// Self-service privacy rights: data export (access/portability) and account deletion.
// GDPR Art. 15/17/20, CCPA/CPRA right to know/delete, Colombia Law 1581 habeas data.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tables keyed by user_id that hold the member's own data.
const EXPORT_TABLES = [
  'profiles', 'communication_preferences', 'legal_consents', 'privacy_requests',
  'trust_submissions', 'trust_asset_uploads', 'family_documents', 'family_office_secure_documents',
  'family_governance_policies', 'family_voting_proposals', 'family_votes', 'succession_progress', 'handoff_settings',
  'investment_portfolios', 'account_transactions', 'bank_statement_uploads', 'bank_statement_transactions', 'connected_accounts',
  'business_goals', 'onboarding_responses', 'program_agreements', 'user_payment_plans', 'subscribers',
  'community_posts', 'community_comments', 'community_reactions', 'community_poll_votes', 'community_call_bookings',
  'group_memberships', 'group_messages', 'message_reactions', 'poll_votes', 'stories',
  'chat_projects', 'chat_conversations', 'ai_chat_history',
  'course_enrollments', 'course_comments', 'lesson_completions', 'course_certificates', 'saved_videos', 'video_comments', 'video_likes',
  'session_attendance', 'session_enrollments', 'survey_submissions', 'weekly_checkin_responses', 'feedback_responses',
  'notifications', 'push_tokens', 'calendar_integrations', 'legacy_meeting_uploads', 'affiliate_signups',
]

// Never export credentials or tokens, even the member's own.
const SECRET_FIELD = /(token|secret|password|key_hash|api_key|access_key|ssn|cursor)/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function scrub(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) out[k] = SECRET_FIELD.test(k) ? '[removed for security]' : v
  return out
}

export async function handleAccountPrivacy(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return json({ error: 'Please sign in again.' }, 401)

    const { action, confirm } = await req.json().catch(() => ({}))

    if (action === 'export') {
      const data: Record<string, unknown> = {
        account: { id: user.id, email: user.email, phone: user.phone, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
      }
      for (const table of EXPORT_TABLES) {
        const { data: rows, error } = await admin.from(table).select('*').eq('user_id', user.id).limit(5000)
        if (!error && rows?.length) data[table] = rows.map(r => scrub(r as Record<string, unknown>))
      }
      if (user.email) {
        const { data: fam } = await admin.from('family_members').select('*').or(`added_by.eq.${user.id},email.eq.${user.email}`).limit(1000)
        if (fam?.length) data.family_members = fam.map(r => scrub(r as Record<string, unknown>))
      }
      await admin.from('privacy_requests').insert({ user_id: user.id, request_type: 'export', status: 'completed' })
      return json({ exported_at: new Date().toISOString(), data })
    }

    if (action === 'delete') {
      if (confirm !== 'DELETE') return json({ error: 'Type DELETE to confirm.' }, 400)
      const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id).in('role', ['owner', 'admin'])
      if (roles?.length) return json({ error: 'Admin and owner accounts must be removed by another owner so the workspace is never left without one.' }, 403)

      await admin.from('privacy_requests').insert({ user_id: user.id, request_type: 'delete', status: 'completed', details: { requested_at: new Date().toISOString() } })

      // Clear references that would otherwise block removing the login.
      await admin.from('trust_page_locks').delete().eq('locked_by', user.id)
      await admin.from('family_members').update({ approved_by: null }).eq('approved_by', user.id)
      await admin.from('ai_persona_settings').update({ updated_by: null }).eq('updated_by', user.id)
      if (user.email) await admin.from('family_members').delete().eq('email', user.email)
      await admin.from('family_members').delete().eq('added_by', user.id)
      await admin.from('communication_preferences').delete().eq('user_id', user.id)
      await admin.from('user_blocks').delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
      for (const table of ['community_posts', 'community_comments', 'chat_conversations', 'chat_projects', 'trust_submissions', 'onboarding_responses', 'weekly_checkin_responses']) {
        await admin.from(table).delete().eq('user_id', user.id)
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error('[account-privacy] delete failed', deleteError.message)
        await admin.from('privacy_requests').insert({ user_id: user.id, request_type: 'delete', status: 'failed', details: { error: deleteError.message } })
        return json({ error: 'We could not finish deleting your account. Our team has been notified and will complete it within 30 days.' }, 500)
      }
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[account-privacy] error', e)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
