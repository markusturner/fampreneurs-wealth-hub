
-- Tighten ai_persona_settings SELECT
DROP POLICY IF EXISTS "Authenticated users can read persona settings" ON public.ai_persona_settings;
CREATE POLICY "Admins can read persona settings"
ON public.ai_persona_settings FOR SELECT TO authenticated
USING (is_current_user_admin() OR is_current_user_owner());

-- Restrict call_recordings SELECT to participants/recorder/admins
DROP POLICY IF EXISTS "Authenticated users can view recordings" ON public.call_recordings;
CREATE POLICY "Participants and admins can view recordings"
ON public.call_recordings FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR is_current_user_owner()
  OR recorded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.call_participants cp
    WHERE cp.call_room_id = call_recordings.call_room_id
      AND cp.user_id = auth.uid()
  )
);

-- Restrict storage SELECT on call-recordings bucket to participants/admins
DROP POLICY IF EXISTS "Authenticated users can read recordings" ON storage.objects;
CREATE POLICY "Participants and admins can read call recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'call-recordings' AND (
    is_current_user_admin()
    OR is_current_user_owner()
    OR EXISTS (
      SELECT 1 FROM public.call_recordings cr
      JOIN public.call_participants cp ON cp.call_room_id = cr.call_room_id
      WHERE cr.storage_path = storage.objects.name
        AND (cp.user_id = auth.uid() OR cr.recorded_by = auth.uid())
    )
  )
);

-- Tighten role_permissions SELECT to authenticated only
DROP POLICY IF EXISTS "Everyone can view role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

-- Tighten trust_documents SELECT to uploader/admins
DROP POLICY IF EXISTS "Authenticated users can view trust documents" ON public.trust_documents;
CREATE POLICY "Uploader and admins can view trust documents"
ON public.trust_documents FOR SELECT TO authenticated
USING (uploaded_by = auth.uid() OR is_current_user_admin() OR is_current_user_owner());

-- Make documents bucket private (it stores ID verifications and per-user files)
UPDATE storage.buckets SET public = false WHERE id = 'documents';
