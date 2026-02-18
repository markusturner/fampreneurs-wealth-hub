
-- Table to store trust form submissions and generated documents
CREATE TABLE public.trust_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trust_type TEXT NOT NULL CHECK (trust_type IN ('business', 'ministry', 'family')),
  form_data JSONB NOT NULL DEFAULT '{}',
  generated_document TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'downloaded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust submissions"
ON public.trust_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trust submissions"
ON public.trust_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trust submissions"
ON public.trust_submissions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trust submissions"
ON public.trust_submissions FOR SELECT
USING (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE TRIGGER update_trust_submissions_updated_at
BEFORE UPDATE ON public.trust_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
