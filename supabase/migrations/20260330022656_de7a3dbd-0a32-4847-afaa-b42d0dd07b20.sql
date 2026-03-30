
-- Table to track admin overrides for trust page locks per user
CREATE TABLE public.trust_page_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_name TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_name)
);

ALTER TABLE public.trust_page_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trust page locks"
  ON public.trust_page_locks
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Users can view their own locks"
  ON public.trust_page_locks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add submission tracking columns to trust_submissions
ALTER TABLE public.trust_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();

-- Add code_issued_at to family_secret_codes for 15-min expiry
ALTER TABLE public.family_secret_codes ADD COLUMN IF NOT EXISTS code_issued_at TIMESTAMPTZ DEFAULT now();

-- Trigger for updated_at on trust_page_locks
CREATE TRIGGER update_trust_page_locks_updated_at
  BEFORE UPDATE ON public.trust_page_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
