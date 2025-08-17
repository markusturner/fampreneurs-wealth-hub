-- Fix profiles RLS causing 403 (auth.users reference) and missing storage insert policy

-- 1) Profiles: replace problematic SELECT/UPDATE policies
DROP POLICY IF EXISTS "users_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_profiles" ON public.profiles;

-- Select: allow only self or via family_members email match (no auth.users references)
CREATE POLICY "profiles_select_self_or_added_family"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = auth.uid()
      AND fm.status = 'active'
      AND fm.email IS NOT NULL
      AND fm.email = profiles.email
  )
);

-- Update: allow users to update only their own profile
CREATE POLICY "profiles_update_own_only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Storage: add missing INSERT policy for profile-photos
CREATE POLICY IF NOT EXISTS "Users can upload their own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);