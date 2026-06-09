
-- client_health_snapshots
CREATE TABLE public.client_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score numeric(3,1) NOT NULL CHECK (score >= 1 AND score <= 10),
  status text NOT NULL CHECK (status IN ('at_risk','slipping','stable','expansion_ready')),
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  arr_value numeric NOT NULL DEFAULT 0,
  program text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chs_user_computed ON public.client_health_snapshots (user_id, computed_at DESC);
CREATE INDEX idx_chs_computed ON public.client_health_snapshots (computed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_health_snapshots TO authenticated;
GRANT ALL ON public.client_health_snapshots TO service_role;
ALTER TABLE public.client_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage client_health_snapshots"
  ON public.client_health_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- client_health_weights (single-row config)
CREATE TABLE public.client_health_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance numeric NOT NULL DEFAULT 25,
  community numeric NOT NULL DEFAULT 20,
  trust numeric NOT NULL DEFAULT 20,
  succession numeric NOT NULL DEFAULT 15,
  response numeric NOT NULL DEFAULT 10,
  tenure numeric NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.client_health_weights DEFAULT VALUES;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_health_weights TO authenticated;
GRANT ALL ON public.client_health_weights TO service_role;
ALTER TABLE public.client_health_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage client_health_weights"
  ON public.client_health_weights FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- retention_messages
CREATE TABLE public.retention_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  status text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','inapp')),
  draft text NOT NULL,
  sent_at timestamptz,
  sent_by uuid,
  response_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_retention_messages_client ON public.retention_messages (client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retention_messages TO authenticated;
GRANT ALL ON public.retention_messages TO service_role;
ALTER TABLE public.retention_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage retention_messages"
  ON public.retention_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
