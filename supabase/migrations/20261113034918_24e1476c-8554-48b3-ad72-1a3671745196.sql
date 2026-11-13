-- Helpers ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.community_program_tier(p_key text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_key IN ('fbu','Community','Family Business University','The Family Business University') THEN 0
    WHEN p_key IN ('tfv','ttv','The Trust Vault','Trust Vault','The Family Vault') THEN 1
    WHEN p_key IN ('tfba','pea','The Private Estate Accelerator','Private Estate Accelerator','The Family Business Accelerator') THEN 2
    WHEN p_key IN ('tffm','tss','The Legacy InnerCircle','Legacy InnerCircle','The Succession Society','Succession Society','The Family Fortune Mastermind') THEN 3
    ELSE NULL END
$$;

-- Community program codes the current user may view (higher tiers include lower ones)
CREATE OR REPLACE FUNCTION public.current_user_community_programs()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH tiers AS (
    SELECT public.community_program_tier(cg.name) AS t
      FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id = gm.group_id
     WHERE gm.user_id = auth.uid()
    UNION ALL
    SELECT public.community_program_tier(regexp_replace(btrim(x), '\s*\([^)]*\)\s*$', ''))
      FROM public.profiles p, unnest(string_to_array(p.program_name, ',')) AS x
     WHERE p.user_id = auth.uid()
    UNION ALL
    SELECT 0 FROM public.subscribers s WHERE s.user_id = auth.uid() AND s.subscribed IS TRUE
  ), top AS (SELECT max(t) AS m FROM tiers)
  SELECT COALESCE(
    (SELECT (ARRAY['fbu','tfv','tfba','tffm'])[1:(top.m + 1)] FROM top WHERE top.m IS NOT NULL), ARRAY[]::text[])
    || CASE WHEN EXISTS (
         SELECT 1 FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id = gm.group_id
          WHERE gm.user_id = auth.uid() AND cg.name = ANY(public.program_group_names('vip'))
       ) THEN ARRAY['vip'] ELSE ARRAY[]::text[] END
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_current_user_admin() OR public.is_current_user_owner()
$$;

-- A real program member, family office member, or staff (not just any new sign-up)
CREATE OR REPLACE FUNCTION public.is_program_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role <> 'member'::member_role)
    OR cardinality(public.current_user_community_programs()) > 0
    OR EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.family_members fm JOIN public.profiles p ON lower(p.email) = lower(fm.email)
                WHERE p.user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_valid_affiliate_signup_user(p_user_id uuid, p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NULL OR p_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id AND lower(p.email) = lower(p_email))
$$;

CREATE OR REPLACE FUNCTION public.affiliate_code_exists(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.affiliate_links l WHERE l.code = p_code)
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_community_programs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_program_member() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_staff() FROM anon;

-- Community posts --------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON public.community_posts;
CREATE POLICY "Members can view their community posts" ON public.community_posts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (SELECT public.is_current_user_staff())
         OR ARRAY[program] <@ (SELECT public.current_user_community_programs()));

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.community_comments;
CREATE POLICY "Members can view comments on visible posts" ON public.community_comments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_comments.post_id));

DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.community_reactions;
CREATE POLICY "Members can view reactions on visible content" ON public.community_reactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_reactions.post_id))
         OR (comment_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.community_comments c WHERE c.id = community_reactions.comment_id)));

DROP POLICY IF EXISTS "Authenticated can view community comment reactions" ON public.community_comment_reactions;
CREATE POLICY "Members can view reactions on visible comments" ON public.community_comment_reactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.community_comments c WHERE c.id = community_comment_reactions.comment_id));

DROP POLICY IF EXISTS "Polls are viewable by authenticated users" ON public.community_polls;
CREATE POLICY "Members can view polls on visible posts" ON public.community_polls
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_polls.post_id));

DROP POLICY IF EXISTS "Poll votes viewable by authenticated" ON public.community_poll_votes;
CREATE POLICY "Members can view votes on visible polls" ON public.community_poll_votes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.community_polls pl WHERE pl.id = community_poll_votes.poll_id));

DROP POLICY IF EXISTS "Authenticated can view community events" ON public.community_events;
CREATE POLICY "Members can view their community events" ON public.community_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_staff())
         OR ARRAY[program] <@ (SELECT public.current_user_community_programs()));

-- Classroom ---------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view course modules" ON public.course_modules;
CREATE POLICY "Users can view modules of accessible courses" ON public.course_modules
  FOR SELECT TO authenticated
  USING (public.can_access_course(course_id));

DROP POLICY IF EXISTS "Authenticated can view course comment likes" ON public.course_comment_likes;
CREATE POLICY "Users can view likes on accessible comments" ON public.course_comment_likes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.course_comments c WHERE c.id = course_comment_likes.comment_id));

DROP POLICY IF EXISTS "Authenticated can view video likes" ON public.video_likes;
CREATE POLICY "Users can view likes on accessible videos" ON public.video_likes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (SELECT public.is_current_user_staff())
         OR EXISTS (SELECT 1 FROM public.course_videos v WHERE v.id = video_likes.video_id));

DROP POLICY IF EXISTS "Authenticated can view video comments" ON public.video_comments;
CREATE POLICY "Users can view comments on accessible videos" ON public.video_comments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (SELECT public.is_current_user_staff())
         OR EXISTS (SELECT 1 FROM public.course_videos v WHERE v.id = video_comments.video_id));

DROP POLICY IF EXISTS "Anyone authenticated can view sop_lesson_links" ON public.sop_lesson_links;
CREATE POLICY "Users can view links for visible SOPs" ON public.sop_lesson_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sops s WHERE s.id = sop_lesson_links.sop_id));

-- Surveys -----------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone signed in can view surveys" ON public.surveys;
CREATE POLICY "Signed in users can view active surveys" ON public.surveys
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Anyone signed in can view questions" ON public.survey_questions;
CREATE POLICY "Signed in users can view active survey questions" ON public.survey_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_questions.survey_id AND s.is_active = true));

-- Settings and reference data --------------------------------------------
DROP POLICY IF EXISTS "Users can view announcements" ON public.announcements;
CREATE POLICY "Members can view current announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_staff())
         OR ((SELECT public.is_program_member()) AND (expires_at IS NULL OR expires_at > now())));

DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Members can view app settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING ((SELECT public.is_program_member()));

DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
CREATE POLICY "Users can view permissions for their roles" ON public.role_permissions
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_staff())
         OR role IN (SELECT r.role::text FROM public.user_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view programs" ON public.programs;
CREATE POLICY "Admins and owners can view programs" ON public.programs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_staff()));

DROP POLICY IF EXISTS "Authenticated can view fulfillment stages" ON public.fulfillment_stages;
CREATE POLICY "Admins and owners can view fulfillment stages" ON public.fulfillment_stages
  FOR SELECT TO authenticated
  USING ((SELECT public.is_current_user_staff()));

-- Tracking inserts --------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Signed in users can record valid page views" ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (
    page_path IN ('/', '/auth', '/apply')
    AND visitor_id IS NOT NULL
    AND visitor_id ~ '^[0-9a-fA-F-]{36}$'
    AND (user_agent IS NULL OR length(user_agent) <= 512)
    AND (referrer IS NULL OR length(referrer) <= 1024)
    AND (ref_code IS NULL OR length(ref_code) <= 64)
  );

DROP POLICY IF EXISTS "Anyone can record affiliate signup" ON public.affiliate_signups;
CREATE POLICY "Visitors can record valid affiliate signups" ON public.affiliate_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    code IS NOT NULL AND length(code) <= 64
    AND public.affiliate_code_exists(code)
    AND (email IS NULL OR (length(email) <= 320 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    AND (visitor_id IS NULL OR length(visitor_id) <= 64)
    AND public.is_valid_affiliate_signup_user(user_id, email)
  );