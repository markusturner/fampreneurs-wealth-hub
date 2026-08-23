CREATE OR REPLACE FUNCTION public.normalize_2fa_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_verification_codes_email ON public.verification_codes;
CREATE TRIGGER normalize_verification_codes_email
BEFORE INSERT OR UPDATE OF email ON public.verification_codes
FOR EACH ROW EXECUTE FUNCTION public.normalize_2fa_email();

DROP TRIGGER IF EXISTS normalize_user_2fa_settings_email ON public.user_2fa_settings;
CREATE TRIGGER normalize_user_2fa_settings_email
BEFORE INSERT OR UPDATE OF email ON public.user_2fa_settings
FOR EACH ROW EXECUTE FUNCTION public.normalize_2fa_email();

UPDATE public.verification_codes SET email = lower(trim(email)) WHERE email <> lower(trim(email));
UPDATE public.user_2fa_settings SET email = lower(trim(email)) WHERE email <> lower(trim(email));

DROP POLICY IF EXISTS "Users can update their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can view their own 2FA settings" ON public.user_2fa_settings;

CREATE POLICY "Users can update their own 2FA settings"
ON public.user_2fa_settings
FOR ALL
TO authenticated
USING (lower(email) = lower(auth.email()))
WITH CHECK (lower(email) = lower(auth.email()));

CREATE POLICY "Users can view their own 2FA settings"
ON public.user_2fa_settings
FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.email()));