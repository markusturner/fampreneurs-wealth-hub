
-- 1. Coach photos: restrict writes to admins/owners
DROP POLICY IF EXISTS "Authenticated users can upload coach photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update coach photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete coach photos" ON storage.objects;

CREATE POLICY "Admins and owners can upload coach photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coach-photos' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins and owners can update coach photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'coach-photos' AND (public.is_current_user_admin() OR public.is_current_user_owner()))
WITH CHECK (bucket_id = 'coach-photos' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins and owners can delete coach photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'coach-photos' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

-- 2. Scope all uid-based storage policies to authenticated role only
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND roles::text = '{public}'
      AND (coalesce(qual,'') ILIKE '%auth.uid%' OR coalesce(with_check,'') ILIKE '%auth.uid%')
  LOOP
    EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated', p.policyname);
  END LOOP;
END $$;

-- 3. Remove duplicate public-role policy on user_roles (identical authenticated policy remains)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
