
-- Add program column to community_posts so each community has its own posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS program text DEFAULT 'tfba';

-- Create an index for filtering by program
CREATE INDEX IF NOT EXISTS idx_community_posts_program ON public.community_posts(program);
