CREATE TABLE public.client_retention_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prev_score numeric,
  new_score numeric,
  prev_status text,
  new_status text,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.client_retention_history TO authenticated;
GRANT ALL ON public.client_retention_history TO service_role;

ALTER TABLE public.client_retention_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view retention history"
ON public.client_retention_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can add retention history"
ON public.client_retention_history FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) AND changed_by = auth.uid());

CREATE INDEX idx_client_retention_history_user ON public.client_retention_history (user_id, created_at DESC);