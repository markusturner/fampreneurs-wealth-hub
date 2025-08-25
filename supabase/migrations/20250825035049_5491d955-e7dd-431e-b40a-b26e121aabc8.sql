-- Harden DB functions and address linter findings

-- 1) Ensure audit_subscriber_admin_access has fixed search_path and masks PII
CREATE OR REPLACE FUNCTION public.audit_subscriber_admin_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Log when admins access subscriber data (not when users access their own)
  IF auth.uid() != NEW.user_id AND public.is_current_user_admin() THEN
    PERFORM public.log_family_office_action(
      'admin_subscriber_access',
      'subscribers',
      NEW.id,
      NULL,
      NULL,
      'high',
      jsonb_build_object(
        'admin_user', auth.uid(),
        'accessed_subscriber', NEW.user_id,
        'subscriber_email_masked', public.mask_sensitive_data(NEW.email, 'email'),
        'access_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2) Move pg_trgm extension objects out of public schema if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    -- Create extensions schema if it doesn't exist
    PERFORM 1 FROM pg_namespace WHERE nspname = 'extensions';
    IF NOT FOUND THEN
      EXECUTE 'CREATE SCHEMA extensions';
    END IF;
    -- Move extension objects
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  END IF;
END$$;