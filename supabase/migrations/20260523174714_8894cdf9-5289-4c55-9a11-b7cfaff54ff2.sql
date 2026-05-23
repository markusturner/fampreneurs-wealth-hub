
CREATE TABLE public.succession_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_key)
);

ALTER TABLE public.succession_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own succession progress"
ON public.succession_progress FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins insert succession progress"
ON public.succession_progress FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins update succession progress"
ON public.succession_progress FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins delete succession progress"
ON public.succession_progress FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_succession_progress_updated_at
BEFORE UPDATE ON public.succession_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_succession_progress_user ON public.succession_progress(user_id);
