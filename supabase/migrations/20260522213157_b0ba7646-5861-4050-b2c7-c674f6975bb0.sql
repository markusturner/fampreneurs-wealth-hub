
-- 1. connected_accounts: hide Plaid token + credentials from API
REVOKE SELECT (plaid_access_token, credentials) ON public.connected_accounts FROM anon, authenticated;
REVOKE UPDATE (plaid_access_token, credentials) ON public.connected_accounts FROM anon, authenticated;
REVOKE INSERT (plaid_access_token, credentials) ON public.connected_accounts FROM anon, authenticated;

-- 2. user_2fa_settings: hide TOTP secret from API
REVOKE SELECT (secret) ON public.user_2fa_settings FROM anon, authenticated;
REVOKE UPDATE (secret) ON public.user_2fa_settings FROM anon, authenticated;
REVOKE INSERT (secret) ON public.user_2fa_settings FROM anon, authenticated;

-- 3. verification_codes: remove client SELECT entirely (verification happens server-side via edge functions)
DROP POLICY IF EXISTS "Users can view their own active verification codes" ON public.verification_codes;

-- 4. meeting_types: restrict to authenticated only, drop public-role policies
DROP POLICY IF EXISTS "Users can view active meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Users can view their own meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Users can create their own meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Users can update their own meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Users can delete their own meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Admins can manage meeting types" ON public.meeting_types;

CREATE POLICY "Authenticated can view active meeting types"
  ON public.meeting_types FOR SELECT TO authenticated
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own meeting types"
  ON public.meeting_types FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meeting types"
  ON public.meeting_types FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own meeting types"
  ON public.meeting_types FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage meeting types"
  ON public.meeting_types FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- 5. profiles: remove from realtime publication to stop broadcasting sensitive fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
END $$;

-- 6. sop-assets bucket: restrict listing via storage API to admins/owners (CDN public URLs still work)
DROP POLICY IF EXISTS "Anyone can view sop assets" ON storage.objects;
CREATE POLICY "Admins and owners can list sop assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sop-assets' AND (public.is_current_user_admin() OR public.is_current_user_owner()));
