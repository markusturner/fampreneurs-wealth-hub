CREATE TABLE IF NOT EXISTS public.community_manager_celebrated_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program TEXT NOT NULL,
  template_key TEXT NOT NULL,
  celebrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, program, template_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_manager_celebrated_users TO authenticated;
GRANT ALL ON public.community_manager_celebrated_users TO service_role;

ALTER TABLE public.community_manager_celebrated_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage celebrated users"
  ON public.community_manager_celebrated_users
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.community_manager_checkin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

GRANT SELECT, INSERT ON public.community_manager_checkin_log TO authenticated;
GRANT ALL ON public.community_manager_checkin_log TO service_role;

ALTER TABLE public.community_manager_checkin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view checkin log"
  ON public.community_manager_checkin_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
