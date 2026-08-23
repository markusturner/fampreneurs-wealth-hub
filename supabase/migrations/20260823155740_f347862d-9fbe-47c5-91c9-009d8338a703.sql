REVOKE ALL ON FUNCTION public.normalize_2fa_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_2fa_email() TO service_role;