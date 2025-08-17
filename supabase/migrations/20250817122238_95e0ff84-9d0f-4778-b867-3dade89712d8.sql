-- Fix Security Definer View vulnerability by replacing the community_profiles view
-- with a secure version that respects RLS policies

-- Drop the existing vulnerable view
DROP VIEW IF EXISTS public.community_profiles;

-- Create a secure function to get community profiles that respects RLS
CREATE OR REPLACE FUNCTION public.get_community_profiles_secure()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, first_initial text)
LANGUAGE sql
STABLE SECURITY INVOKER -- Use SECURITY INVOKER instead of DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  -- This function will respect the RLS policies on profiles table
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN LENGTH(COALESCE(p.first_name, '')) > 0 THEN LEFT(p.first_name, 1) || '.'
      ELSE NULL 
    END as first_initial
  FROM public.profiles p
  WHERE 
    -- Only return profiles that should be visible in community features
    p.display_name IS NOT NULL
    -- RLS policies will automatically filter based on user permissions
$$;

-- Create a new secure view that uses the function
CREATE VIEW public.community_profiles_secure AS
SELECT * FROM public.get_community_profiles_secure();

-- Update the existing get_community_profiles function to be more secure
-- by ensuring it only returns profiles the current user can see
CREATE OR REPLACE FUNCTION public.get_community_profiles()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, first_initial text)
LANGUAGE sql
STABLE SECURITY INVOKER -- Changed from SECURITY DEFINER to SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN LENGTH(COALESCE(p.first_name, '')) > 0 THEN LEFT(p.first_name, 1) || '.'
      ELSE NULL 
    END as first_initial
  FROM public.profiles p
  WHERE 
    -- Only return profiles that should be visible in community features
    p.display_name IS NOT NULL
    -- RLS policies will automatically apply when using SECURITY INVOKER
$$;

-- Also update get_community_profile function for consistency
CREATE OR REPLACE FUNCTION public.get_community_profile(target_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, first_initial text)
LANGUAGE sql
STABLE SECURITY INVOKER -- Changed from SECURITY DEFINER to SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN LENGTH(COALESCE(p.first_name, '')) > 0 THEN LEFT(p.first_name, 1) || '.'
      ELSE NULL 
    END as first_initial
  FROM public.profiles p
  WHERE 
    p.user_id = target_user_id
    AND p.display_name IS NOT NULL
    -- RLS policies will automatically apply
$$;