-- Adjust profiles RLS and storage policies to resolve 403 errors and allow avatar uploads

-- 1) PROFILES: replace policies that referenced auth.users and avoided admin recursion
DROP POLICY IF EXISTS "users_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_profiles" ON public.profiles;

-- Keep existing INSERT/DELETE policies as-is. Recreate safe SELECT/UPDATE policies.
CREATE POLICY "profiles_select_self_or_added_family"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.added_by = auth.uid()
        AND fm.status = 'active'
        AND fm.email IS NOT NULL
        AND fm.email = profiles.email
    )
  )
);

CREATE POLICY "profiles_update_own_only"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) STORAGE: allow authenticated users to upload/update/delete to their own folder in profile-photos bucket
CREATE POLICY IF NOT EXISTS "profile_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "profile_photos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "profile_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
