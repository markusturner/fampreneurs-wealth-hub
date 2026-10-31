-- Consent log (append-only)
CREATE TABLE public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  document_version text NOT NULL,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.legal_consents TO authenticated;
GRANT ALL ON public.legal_consents TO service_role;
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users add their own consents" ON public.legal_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and admins read consents" ON public.legal_consents FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_admin() OR public.is_current_user_owner());
CREATE INDEX legal_consents_user_idx ON public.legal_consents(user_id, consent_type, created_at DESC);

-- Communication preferences
CREATE TABLE public.communication_preferences (
  user_id uuid PRIMARY KEY,
  push_enabled boolean NOT NULL DEFAULT true,
  email_updates boolean NOT NULL DEFAULT true,
  email_marketing boolean NOT NULL DEFAULT false,
  sms_enabled boolean NOT NULL DEFAULT false,
  sms_phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.communication_preferences TO authenticated;
GRANT ALL ON public.communication_preferences TO service_role;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own preferences" ON public.communication_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_admin() OR public.is_current_user_owner());
CREATE POLICY "Users insert own preferences" ON public.communication_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON public.communication_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Content reports
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  reported_user_id uuid,
  reason text NOT NULL,
  details text,
  content_snapshot text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND status = 'open' AND reviewed_by IS NULL);
CREATE POLICY "Reporters and moderators read reports" ON public.content_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.is_current_user_admin() OR public.is_current_user_owner());
CREATE POLICY "Moderators update reports" ON public.content_reports FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner()) WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

-- User blocks
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.user_blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

-- DMCA notices (public form)
CREATE TABLE public.dmca_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_name text NOT NULL,
  complainant_email text NOT NULL,
  complainant_address text,
  copyrighted_work text NOT NULL,
  infringing_location text NOT NULL,
  good_faith_statement boolean NOT NULL DEFAULT false,
  accuracy_statement boolean NOT NULL DEFAULT false,
  signature text NOT NULL,
  notice_type text NOT NULL DEFAULT 'takedown',
  status text NOT NULL DEFAULT 'received',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.dmca_notices TO anon;
GRANT SELECT, INSERT, UPDATE ON public.dmca_notices TO authenticated;
GRANT ALL ON public.dmca_notices TO service_role;
ALTER TABLE public.dmca_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a DMCA notice" ON public.dmca_notices FOR INSERT TO anon, authenticated WITH CHECK (good_faith_statement AND accuracy_statement AND status = 'received' AND admin_notes IS NULL);
CREATE POLICY "Moderators read DMCA notices" ON public.dmca_notices FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner());
CREATE POLICY "Moderators update DMCA notices" ON public.dmca_notices FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner()) WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

-- Breach / security incident log
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz,
  users_notified_at timestamptz,
  regulators_notified_at timestamptz,
  affected_data text,
  affected_user_count integer,
  description text,
  actions_taken text,
  reported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.security_incidents TO authenticated;
GRANT ALL ON public.security_incidents TO service_role;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read incidents" ON public.security_incidents FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner());
CREATE POLICY "Admins log incidents" ON public.security_incidents FOR INSERT TO authenticated WITH CHECK ((public.is_current_user_admin() OR public.is_current_user_owner()) AND reported_by = auth.uid());
CREATE POLICY "Admins update incidents" ON public.security_incidents FOR UPDATE TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner()) WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

-- Privacy requests log (export / deletion)
CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.privacy_requests TO authenticated;
GRANT ALL ON public.privacy_requests TO service_role;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and admins read privacy requests" ON public.privacy_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_admin() OR public.is_current_user_owner());