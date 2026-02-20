ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
