CREATE TABLE public.community_member_activity (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_member_activity TO authenticated;
GRANT ALL ON public.community_member_activity TO service_role;
ALTER TABLE public.community_member_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own activity" ON public.community_member_activity
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_member_activity()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.community_member_activity (user_id, last_seen_at)
  SELECT auth.uid(), now() WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
  WHERE public.community_member_activity.last_seen_at < now() - interval '1 minute';
$$;

CREATE OR REPLACE FUNCTION public.get_member_last_seen(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_seen_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, a.last_seen_at
    FROM public.community_member_activity a
   WHERE a.user_id = ANY(p_user_ids)
     AND (public.is_current_user_staff() OR cardinality(public.current_user_community_programs()) > 0);
$$;

REVOKE EXECUTE ON FUNCTION public.touch_member_activity() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_member_last_seen(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_member_activity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_member_last_seen(uuid[]) TO authenticated, service_role;

-- Seed with the most recent known activity
INSERT INTO public.community_member_activity (user_id, last_seen_at)
SELECT uid, max(ts) FROM (
  SELECT id AS uid, last_sign_in_at AS ts FROM auth.users WHERE last_sign_in_at IS NOT NULL
  UNION ALL SELECT user_id, created_at FROM public.community_posts
  UNION ALL SELECT user_id, created_at FROM public.community_comments
) s WHERE uid IS NOT NULL AND ts IS NOT NULL AND ts <= now()
GROUP BY uid
ON CONFLICT (user_id) DO NOTHING;