
-- Helper: verified family membership
CREATE OR REPLACE FUNCTION public.is_verified_family_member(_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = _owner_id
      AND fm.status = 'active'
      AND lower(fm.email) = lower((SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text)
      AND (
        fm.joined_at IS NOT NULL
        OR EXISTS (SELECT 1 FROM public.family_member_credentials c
                   WHERE c.family_member_id = fm.id AND c.is_active = true)
      )
  )
$$;

-- Helper: course access
CREATE OR REPLACE FUNCTION public.can_access_course(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id
      AND (
        c.is_private IS NOT TRUE
        OR c.created_by = auth.uid()
        OR public.is_current_user_admin()
        OR public.is_current_user_owner()
        OR EXISTS (SELECT 1 FROM public.course_enrollments e
                   WHERE e.course_id = c.id AND e.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.group_memberships gm
                   WHERE gm.user_id = auth.uid()
                     AND c.community_ids IS NOT NULL
                     AND gm.group_id::text = ANY (c.community_ids::text[]))
      )
  )
$$;

-- community_groups
DROP POLICY IF EXISTS "Users can view all groups" ON public.community_groups;
CREATE POLICY "Users can view accessible groups" ON public.community_groups
FOR SELECT TO authenticated
USING (
  is_private IS NOT TRUE
  OR created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
  OR EXISTS (SELECT 1 FROM public.group_memberships gm
             WHERE gm.group_id = community_groups.id AND gm.user_id = auth.uid())
);

-- courses
DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
CREATE POLICY "Users can view accessible courses" ON public.courses
FOR SELECT TO authenticated
USING (
  is_private IS NOT TRUE
  OR created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
  OR EXISTS (SELECT 1 FROM public.course_enrollments e
             WHERE e.course_id = courses.id AND e.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.group_memberships gm
             WHERE gm.user_id = auth.uid()
               AND courses.community_ids IS NOT NULL
               AND gm.group_id::text = ANY (courses.community_ids::text[]))
);

-- call_rooms
DROP POLICY IF EXISTS "Authenticated users can view call rooms" ON public.call_rooms;
CREATE POLICY "Members and admins can view call rooms" ON public.call_rooms
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
  OR EXISTS (SELECT 1 FROM public.call_participants cp
             WHERE cp.call_room_id = call_rooms.id AND cp.user_id = auth.uid())
  OR (community_group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.group_memberships gm
        WHERE gm.group_id = call_rooms.community_group_id AND gm.user_id = auth.uid()))
);

-- family email-match policies -> verified membership
DROP POLICY IF EXISTS "Family members can view document templates" ON public.document_templates;
CREATE POLICY "Verified family members can view document templates" ON public.document_templates
FOR SELECT TO authenticated USING (public.is_verified_family_member(created_by));

DROP POLICY IF EXISTS "Family members can view governance policies" ON public.family_governance_policies;
CREATE POLICY "Verified family members can view governance policies" ON public.family_governance_policies
FOR SELECT TO authenticated USING (public.is_verified_family_member(user_id));

DROP POLICY IF EXISTS "Authorized family members can view documents" ON public.family_office_secure_documents;
CREATE POLICY "Verified family members can view documents" ON public.family_office_secure_documents
FOR SELECT TO authenticated USING (public.is_verified_family_member(user_id));

DROP POLICY IF EXISTS "Family members can view voting proposals" ON public.family_voting_proposals;
CREATE POLICY "Verified family members can view voting proposals" ON public.family_voting_proposals
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_verified_family_member(user_id));

DROP POLICY IF EXISTS "Family members can view votes on proposals they can access" ON public.family_votes;
DROP POLICY IF EXISTS "Users can view votes for accessible proposals" ON public.family_votes;
CREATE POLICY "Users can view votes for accessible proposals" ON public.family_votes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.family_voting_proposals fvp
             WHERE fvp.id = family_votes.proposal_id
               AND (fvp.user_id = auth.uid() OR public.is_verified_family_member(fvp.user_id)))
);

-- storage: cover-photos / community-photos ownership
DROP POLICY IF EXISTS "Allow authenticated deletes from cover-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to cover-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete community photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update community photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community photos" ON storage.objects;

CREATE POLICY "Owners or admins can upload cover photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cover-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Owners or admins can delete cover photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'cover-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Owners or admins can upload community photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Owners or admins can update community photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'community-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()))
WITH CHECK (bucket_id = 'community-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Owners or admins can delete community photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'community-photos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin() OR public.is_current_user_owner()));

-- storage: course videos require course access
DROP POLICY IF EXISTS "Course videos accessible to authenticated users" ON storage.objects;
CREATE POLICY "Course videos readable by authorized users" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'course-videos' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
  OR EXISTS (
      SELECT 1 FROM public.course_videos cv
      WHERE cv.video_url LIKE '%' || objects.name
        AND public.can_access_course(cv.course_id))
));
