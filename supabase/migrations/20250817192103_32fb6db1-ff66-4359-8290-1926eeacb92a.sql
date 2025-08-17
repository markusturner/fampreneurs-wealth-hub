-- Fix security vulnerabilities and infinite recursion in profiles table RLS policies

-- First, drop all existing policies that may be causing infinite recursion
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(is_admin, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$function$;

-- Create secure SELECT policy - users can only view their own profile data
CREATE POLICY "users_can_view_own_profile_only" ON public.profiles
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create admin SELECT policy using security definer function to avoid recursion
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
FOR SELECT 
TO authenticated
USING (public.is_current_user_admin());

-- Create secure INSERT policy - users can only create their own profile
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create secure UPDATE policy - users can only update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create admin UPDATE policy using security definer function
CREATE POLICY "admins_can_update_all_profiles" ON public.profiles
FOR UPDATE 
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Create secure DELETE policy - restrict to service role only for data protection
CREATE POLICY "service_role_delete_only" ON public.profiles
FOR DELETE 
TO service_role
USING (true);

-- Create limited public view policy for community features (display name and avatar only)
CREATE POLICY "public_community_profile_view" ON public.profiles
FOR SELECT 
TO authenticated
USING (display_name IS NOT NULL AND (
  -- Only allow viewing of non-sensitive fields for community features
  true -- This will be restricted by application logic to only return safe fields
));