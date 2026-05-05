ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON public.community_posts(program, pinned, pinned_at DESC);