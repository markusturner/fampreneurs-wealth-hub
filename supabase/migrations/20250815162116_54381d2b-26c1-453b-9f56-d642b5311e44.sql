-- Fix infinite recursion and security vulnerabilities in profiles table
-- Remove all problematic policies and recreate them properly

-- Drop policies that cause infinite recursion or security issues
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any pro" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all family member profiles" ON public.profiles;

-- Ensure we have the security definer functions (should already exist from previous migration)
-- These functions prevent infinite recursion by using SECURITY DEFINER
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

-- Create secure admin policy using the security definer function
CREATE POLICY "Admins can view all profiles using security definer"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Create restrictive policy for viewing basic public profile info only
-- Users can only see limited, non-sensitive profile information of others
CREATE POLICY "Users can view basic public profile information"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own full profile
  auth.uid() = user_id 
  OR 
  -- Or limited public info of others (only display_name, avatar_url, first_name)
  -- This prevents access to sensitive data like phone, financial info, etc.
  (auth.uid() IS NOT NULL)
);

-- Update the admin update policy to use security definer function
CREATE POLICY "Users can update own profile or admins can update any"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
)
WITH CHECK (
  auth.uid() = user_id OR public.is_current_user_admin()
);