-- 1) user_roles: prevent admins from granting the owner role
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- 2) coaches: link to stable user_id instead of email matching
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.coaches c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL AND lower(u.email) = lower(c.email);

DROP POLICY IF EXISTS "Coaches can manage own profile" ON public.coaches;
DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coaches;
DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coaches;

CREATE POLICY "Coaches can view own profile"
ON public.coaches FOR SELECT TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Coaches can update own profile"
ON public.coaches FOR UPDATE TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid())
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- 3) family_members: restrict cross-tenant PII visibility to owners only
DROP POLICY IF EXISTS "Admins can view all family members" ON public.family_members;

CREATE POLICY "Owners can view all family members"
ON public.family_members FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'owner'::member_role));

-- 4) storage: use role system instead of legacy profiles.is_admin
DROP POLICY IF EXISTS "Admins can upload coaching recordings" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload tutorial videos" ON storage.objects;

CREATE POLICY "Admins can upload coaching recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coaching-recordings' AND (public.is_current_user_admin() OR public.is_current_user_owner()));