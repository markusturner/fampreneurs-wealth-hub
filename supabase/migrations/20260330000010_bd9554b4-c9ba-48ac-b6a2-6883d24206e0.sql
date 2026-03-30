-- ==============================================
-- FIX 1: Video documents storage - restrict to authenticated users only
-- ==============================================
DROP POLICY IF EXISTS "Video documents are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view video documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-documents');

-- Also fix the upload/update/delete policies to use authenticated role instead of public
DROP POLICY IF EXISTS "Users can upload documents to their videos" ON storage.objects;
CREATE POLICY "Users can upload documents to their videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their video documents" ON storage.objects;
CREATE POLICY "Users can update their video documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'video-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their video documents" ON storage.objects;
CREATE POLICY "Users can delete their video documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- ==============================================
-- FIX 2: payment_reminders_sent - remove overly permissive public policy
-- ==============================================
DROP POLICY IF EXISTS "Service role can manage payment reminders" ON public.payment_reminders_sent;

-- ==============================================
-- FIX 3: course_resources - restrict mutations to admins/owners
-- ==============================================
DROP POLICY IF EXISTS "Authenticated users can manage resources" ON public.course_resources;
DROP POLICY IF EXISTS "Authenticated users can update resources" ON public.course_resources;
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON public.course_resources;

CREATE POLICY "Admins and owners can insert resources"
ON public.course_resources FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin() OR is_current_user_owner());

CREATE POLICY "Admins and owners can update resources"
ON public.course_resources FOR UPDATE
TO authenticated
USING (is_current_user_admin() OR is_current_user_owner());

CREATE POLICY "Admins and owners can delete resources"
ON public.course_resources FOR DELETE
TO authenticated
USING (is_current_user_admin() OR is_current_user_owner());

-- ==============================================
-- FIX 4: Realtime messages - add RLS policy
-- ==============================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;