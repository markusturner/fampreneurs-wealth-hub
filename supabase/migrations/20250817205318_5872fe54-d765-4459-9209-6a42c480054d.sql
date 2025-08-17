-- Fix profiles RLS causing 403 (auth.users reference) and add storage insert policy

-- 1) Profiles: replace problematic SELECT/UPDATE policies that reference auth.users
DROP POLICY IF EXISTS "users_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_profiles" ON public.profiles;

-- Select: allow only self (no auth.users references)
CREATE POLICY "profiles_select_self_only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update: allow users to update only their own profile
CREATE POLICY "profiles_update_own_only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Storage: add missing INSERT policy for profile-photos (drop then recreate)
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;

CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);