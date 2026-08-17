DELETE FROM public.community_comment_reactions;
ALTER TABLE public.community_comment_reactions DROP CONSTRAINT IF EXISTS community_comment_reactions_comment_id_fkey;
ALTER TABLE public.community_comment_reactions ADD CONSTRAINT community_comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.community_comments(id) ON DELETE CASCADE;
GRANT SELECT, INSERT, DELETE ON public.community_comment_reactions TO authenticated;
GRANT ALL ON public.community_comment_reactions TO service_role;