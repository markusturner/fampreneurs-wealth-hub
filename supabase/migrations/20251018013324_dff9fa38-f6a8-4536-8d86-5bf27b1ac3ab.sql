-- Fix ambiguous column reference in is_family_office_only_user function
-- The issue is that the parameter name 'user_id' conflicts with column names
DROP FUNCTION IF EXISTS public.is_family_office_only_user(uuid);

CREATE OR REPLACE FUNCTION public.is_family_office_only_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = p_user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = p_user_id 
      AND p.email = fm.email 
      AND fm.family_position = 'Family Office Team'
    )
  );
END;
$function$;