CREATE TABLE public.dfo_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  sub_section text,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dfo_usage_events TO authenticated;
GRANT ALL ON public.dfo_usage_events TO service_role;
ALTER TABLE public.dfo_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own DFO usage" ON public.dfo_usage_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read DFO usage" ON public.dfo_usage_events FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner());
CREATE INDEX dfo_usage_events_created_idx ON public.dfo_usage_events (created_at DESC);