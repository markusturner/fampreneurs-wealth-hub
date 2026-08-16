DROP POLICY IF EXISTS "Authenticated users can read persona docs" ON storage.objects;
CREATE POLICY "Admins can read persona docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-persona-documents' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

DROP POLICY IF EXISTS "Authenticated users can view video documents" ON public.video_documents;
CREATE POLICY "Users with course access can view video documents"
ON public.video_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_videos cv
    WHERE cv.id = video_documents.video_id
      AND public.can_access_course(cv.course_id)
  )
  OR uploaded_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_owner()
);