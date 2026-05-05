
-- 1) PROFILES: remove blanket "all authenticated can view" policy.
-- Self + admin policies already exist.
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2) MEETING_REMINDERS: restrict SELECT to admins only (server jobs use service role).
DROP POLICY IF EXISTS "Authenticated users can view meeting reminders" ON public.meeting_reminders;

CREATE POLICY "Admins can view meeting reminders"
ON public.meeting_reminders FOR SELECT TO authenticated
USING (public.is_current_user_admin());

-- 3) SESSION_ENROLLMENTS: restrict SELECT to authenticated; user sees own + admins.
DROP POLICY IF EXISTS "Users can view enrollments for sessions they can see" ON public.session_enrollments;

CREATE POLICY "Users can view their own enrollments"
ON public.session_enrollments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- 4) FAMILY_MEMBER_CREDENTIALS: drop password_hash column (auth handled by Supabase Auth).
ALTER TABLE public.family_member_credentials DROP COLUMN IF EXISTS password_hash;

-- 5) STORAGE: trust-documents -> private; lock SELECT to owner/admin.
UPDATE storage.buckets SET public = false WHERE id = 'trust-documents';
DROP POLICY IF EXISTS "Anyone can read trust documents" ON storage.objects;

CREATE POLICY "Trust docs readable by uploader or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trust-documents'
  AND (
    public.is_current_user_admin()
    OR public.is_current_user_owner()
    OR EXISTS (
      SELECT 1 FROM public.trust_documents td
      WHERE td.file_path = storage.objects.name
        AND td.uploaded_by = auth.uid()
    )
  )
);

-- 6) STORAGE: coaching-recordings -> remove public SELECT, restrict to authenticated admins/owner.
DROP POLICY IF EXISTS "Coaching recordings are publicly accessible" ON storage.objects;

CREATE POLICY "Coaching recordings authenticated access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'coaching-recordings'
  AND (
    public.is_current_user_admin()
    OR public.is_current_user_owner()
    OR public.user_has_premium_subscription(auth.uid())
  )
);

-- 7) STORAGE: message-attachments -> authenticated only, owner-folder scoped.
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view their message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 8) STORAGE: document-templates -> authenticated only, owner-folder scoped.
DROP POLICY IF EXISTS "Users can view document templates" ON storage.objects;

CREATE POLICY "Authenticated users can view their document templates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'document-templates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 9) STORAGE: documents bucket -> add path ownership on upload.
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload to own folder in documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
