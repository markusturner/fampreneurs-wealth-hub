
CREATE TABLE public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  join_url TEXT,
  cover_image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_events TO authenticated;
GRANT ALL ON public.community_events TO service_role;

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view community events"
  ON public.community_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and owners can insert community events"
  ON public.community_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::member_role)
    OR public.has_role(auth.uid(), 'owner'::member_role)
  );

CREATE POLICY "Admins and owners can update community events"
  ON public.community_events FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::member_role)
    OR public.has_role(auth.uid(), 'owner'::member_role)
  );

CREATE POLICY "Admins and owners can delete community events"
  ON public.community_events FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::member_role)
    OR public.has_role(auth.uid(), 'owner'::member_role)
  );

CREATE INDEX idx_community_events_program_time ON public.community_events (program, event_at);

CREATE TRIGGER community_events_set_updated_at
  BEFORE UPDATE ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
