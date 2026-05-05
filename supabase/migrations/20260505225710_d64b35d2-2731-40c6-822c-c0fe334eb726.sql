
-- Community post enhancements
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Polls
CREATE TABLE IF NOT EXISTS public.community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_polls_post ON public.community_polls(post_id);

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll ON public.community_poll_votes(poll_id);

ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls are viewable by authenticated users"
  ON public.community_polls FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create polls on their own posts"
  ON public.community_polls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors and admins can update polls"
  ON public.community_polls FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors and admins can delete polls"
  ON public.community_polls FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Poll votes viewable by authenticated"
  ON public.community_poll_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can cast their own poll vote"
  ON public.community_poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their own poll vote"
  ON public.community_poll_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own poll vote"
  ON public.community_poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
