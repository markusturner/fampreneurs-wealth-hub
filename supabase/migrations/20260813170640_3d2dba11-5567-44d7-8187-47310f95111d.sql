-- course_videos
DROP POLICY IF EXISTS "Authenticated users can view course videos" ON public.course_videos;
CREATE POLICY "Users can view videos of accessible courses"
ON public.course_videos FOR SELECT TO authenticated
USING (public.can_access_course(course_id));

-- course_resources
DROP POLICY IF EXISTS "Authenticated can view course resources" ON public.course_resources;
CREATE POLICY "Users can view resources of accessible courses"
ON public.course_resources FOR SELECT TO authenticated
USING (public.can_access_course(course_id));

-- course_comments
DROP POLICY IF EXISTS "Authenticated can view course comments" ON public.course_comments;
CREATE POLICY "Users can view comments of accessible courses"
ON public.course_comments FOR SELECT TO authenticated
USING (public.can_access_course(course_id));

-- lesson_transcripts (lesson_id -> course_videos.id)
DROP POLICY IF EXISTS "Authenticated can read transcripts" ON public.lesson_transcripts;
CREATE POLICY "Users can read transcripts of accessible courses"
ON public.lesson_transcripts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.course_videos v
  WHERE v.id = lesson_transcripts.lesson_id
    AND public.can_access_course(v.course_id)
));

-- profiles insert: also block admin_permissions escalation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(is_admin, false) = false
  AND COALESCE(is_moderator, false) = false
  AND COALESCE(is_accountability_partner, false) = false
  AND COALESCE(array_length(admin_permissions, 1), 0) = 0
);

-- realtime: scope broadcast/presence topics to the current user
DROP POLICY IF EXISTS "Authenticated only realtime" ON realtime.messages;
CREATE POLICY "Users can access their own realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (realtime.topic() LIKE '%' || auth.uid()::text || '%');
