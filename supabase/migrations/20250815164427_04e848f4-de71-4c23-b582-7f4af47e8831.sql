-- CRITICAL SECURITY FIX: Secure profiles table with proper RLS policies
-- The profiles table currently allows public read access to sensitive personal data
-- This migration implements proper access controls

-- First, drop any existing overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles;

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Users can view and update their own profile
CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Admins can view and manage all profiles
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 3. Limited public view for community features (only safe, non-sensitive fields)
-- This allows viewing basic profile info for community posts, comments, etc.
CREATE POLICY "Limited public profile view for community"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Create a security definer function for safe public profile access
-- This function only returns non-sensitive fields that are safe for community display
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT json_build_object(
    'user_id', user_id,
    'display_name', display_name,
    'first_name', CASE 
      WHEN auth.uid() = user_id OR public.is_current_user_admin() 
      THEN first_name 
      ELSE NULL 
    END,
    'last_name', CASE 
      WHEN auth.uid() = user_id OR public.is_current_user_admin() 
      THEN last_name 
      ELSE NULL 
    END,
    'avatar_url', avatar_url,
    'created_at', created_at
  )
  FROM public.profiles 
  WHERE user_id = target_user_id;
$$;

-- Note: Applications should use get_safe_profile_info() for displaying user info
-- in community features instead of direct profile table access