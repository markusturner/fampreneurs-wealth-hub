-- Replace single community_id with community_ids array
ALTER TABLE public.courses
  DROP COLUMN IF EXISTS community_id,
  ADD COLUMN IF NOT EXISTS community_ids uuid[] NOT NULL DEFAULT '{}';
