DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.call_participants;

CREATE POLICY "Participants and admins can view participants"
ON public.call_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
  OR EXISTS (
    SELECT 1 FROM public.call_rooms cr
    WHERE cr.id = call_participants.call_room_id
      AND cr.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.call_participants me
    WHERE me.call_room_id = call_participants.call_room_id
      AND me.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can view video documents" ON storage.objects;

CREATE POLICY "Course access required to view video documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-documents'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_current_user_admin()
    OR public.is_current_user_owner()
    OR EXISTS (
      SELECT 1
      FROM public.video_documents vd
      JOIN public.course_videos cv ON cv.id = vd.video_id
      WHERE vd.file_url LIKE '%' || storage.objects.name
        AND (public.can_access_course(cv.course_id) OR vd.uploaded_by = auth.uid())
    )
  )
);