-- Fix security-critical function search paths using DO block
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
    AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig))
    AND p.proname NOT LIKE 'pg_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
        func_record.proname, func_record.args);
      RAISE NOTICE 'Fixed: %', func_record.proname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix %: %', func_record.proname, SQLERRM;
    END;
  END LOOP;
END
$$;