-- Simple fix for the circular dependency issue

-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;

-- Create a simpler admin check function that doesn't cause circular dependency
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE profiles.user_id = COALESCE($1, auth.uid());
$$;