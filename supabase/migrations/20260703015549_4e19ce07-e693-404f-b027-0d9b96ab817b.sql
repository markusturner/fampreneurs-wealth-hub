
-- 1. Fix course-videos storage: replace public SELECT policy with authenticated-only
DROP POLICY IF EXISTS "Course videos are publicly accessible" ON storage.objects;
CREATE POLICY "Course videos accessible to authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-videos');

-- 2. Remove permissive full-read policy on messages
DROP POLICY IF EXISTS "Authenticated only realtime" ON public.messages;

-- 3. Fix profiles INSERT to prevent privilege escalation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(is_admin, false) = false
  AND COALESCE(is_moderator, false) = false
  AND COALESCE(is_accountability_partner, false) = false
);

-- Replace profiles.is_admin-based policies with is_current_user_admin()
DROP POLICY IF EXISTS "Admins and moderators can delete any post" ON public.community_posts;
CREATE POLICY "Admins and moderators can delete any post"
ON public.community_posts FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage fulfillment stages" ON public.fulfillment_stages;
CREATE POLICY "Admins can manage fulfillment stages"
ON public.fulfillment_stages FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage user progress" ON public.user_fulfillment_progress;
CREATE POLICY "Admins can manage user progress"
ON public.user_fulfillment_progress FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());
