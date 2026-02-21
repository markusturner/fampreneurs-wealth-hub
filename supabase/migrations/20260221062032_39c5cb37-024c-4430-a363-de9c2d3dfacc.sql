ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS community_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS community_frequency jsonb DEFAULT '{}';