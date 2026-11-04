CREATE OR REPLACE FUNCTION public.restore_access_on_extension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.contract_extension_date IS NOT NULL
     AND NEW.contract_extension_date IS DISTINCT FROM OLD.contract_extension_date
     AND NEW.contract_extension_date >= current_date
     AND COALESCE(NEW.subscription_paused, false) = false THEN
    NEW.truheirs_access := true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_access_on_extension() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS restore_access_on_extension ON public.profiles;
CREATE TRIGGER restore_access_on_extension
BEFORE UPDATE OF contract_extension_date ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.restore_access_on_extension();

UPDATE public.profiles
SET truheirs_access = true
WHERE truheirs_access = false
  AND contract_extension_date >= current_date
  AND COALESCE(subscription_paused, false) = false
  AND COALESCE(is_admin, false) = false;