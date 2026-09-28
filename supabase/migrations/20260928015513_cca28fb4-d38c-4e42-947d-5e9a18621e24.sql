ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_paused boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS paused_at timestamptz;
CREATE TABLE public.family_report_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, quarter text NOT NULL, net_worth numeric, sent_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, quarter));
GRANT SELECT ON public.family_report_log TO authenticated;
GRANT ALL ON public.family_report_log TO service_role;
ALTER TABLE public.family_report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view report log" ON public.family_report_log FOR SELECT TO authenticated USING (public.is_current_user_admin() OR auth.uid() = user_id);