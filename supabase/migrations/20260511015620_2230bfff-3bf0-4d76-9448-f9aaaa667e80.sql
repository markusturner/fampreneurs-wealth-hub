
-- 1) Prevent privilege escalation via profiles UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Allow if caller is an admin (checked via SECURITY DEFINER bypassing RLS)
  SELECT COALESCE(is_admin, false) INTO caller_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
    -- Force these privilege fields to remain unchanged for non-admin updates
    NEW.is_admin := OLD.is_admin;
    NEW.is_moderator := OLD.is_moderator;
    NEW.admin_permissions := OLD.admin_permissions;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Lock down meeting_reminders: drop the public-role catch-all policy
DROP POLICY IF EXISTS "Service role can manage meeting reminders" ON public.meeting_reminders;

-- Re-create scoped to service_role only (service_role bypasses RLS anyway, but explicit policy avoids confusion)
CREATE POLICY "Service role manages meeting reminders"
ON public.meeting_reminders
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3) Documents bucket: restrict DELETE to file owner
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4) Hide sensitive token columns from client API roles (column-level revoke)
-- connected_accounts: Plaid token + credentials
REVOKE SELECT (plaid_access_token, credentials) ON public.connected_accounts FROM anon, authenticated;

-- calendar_integrations: OAuth tokens
REVOKE SELECT (access_token, refresh_token) ON public.calendar_integrations FROM anon, authenticated;

-- verification_codes: raw OTP code
REVOKE SELECT (code) ON public.verification_codes FROM anon, authenticated;

-- family_secret_codes: raw access code
REVOKE SELECT (code) ON public.family_secret_codes FROM anon, authenticated;
