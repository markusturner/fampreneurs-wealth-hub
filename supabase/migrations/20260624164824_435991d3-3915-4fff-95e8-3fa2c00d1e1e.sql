CREATE TABLE public.client_retention_note_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_retention_note_entries TO authenticated;
GRANT ALL ON public.client_retention_note_entries TO service_role;

ALTER TABLE public.client_retention_note_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view retention note entries"
ON public.client_retention_note_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can insert retention note entries"
ON public.client_retention_note_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners can delete retention note entries"
ON public.client_retention_note_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX idx_client_retention_note_entries_user ON public.client_retention_note_entries(user_id, created_at DESC);

-- Backfill existing single notes as first entries so nothing is lost
INSERT INTO public.client_retention_note_entries (user_id, note, created_by, created_at)
SELECT user_id, note, updated_by, created_at
FROM public.client_retention_notes
WHERE note IS NOT NULL AND length(trim(note)) > 0;