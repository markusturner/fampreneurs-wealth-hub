-- Fix infinite recursion in profiles RLS policies
-- Create security definer function to check admin status without recursion

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create new admin policy using the security definer function
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Also fix the accountability partner policy to avoid recursion
DROP POLICY IF EXISTS "Accountability partners can view assigned user profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_current_user_accountability_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_accountability_partner, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

CREATE POLICY "Accountability partners can view assigned user profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_accountability_partner());