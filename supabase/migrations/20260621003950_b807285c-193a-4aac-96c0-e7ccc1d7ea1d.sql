
CREATE TABLE public.client_retention_notes (
  user_id UUID PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  status_override TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_retention_notes TO authenticated;
GRANT ALL ON public.client_retention_notes TO service_role;

ALTER TABLE public.client_retention_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view retention notes"
ON public.client_retention_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can insert retention notes"
ON public.client_retention_notes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can update retention notes"
ON public.client_retention_notes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can delete retention notes"
ON public.client_retention_notes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_client_retention_notes_updated_at
BEFORE UPDATE ON public.client_retention_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
