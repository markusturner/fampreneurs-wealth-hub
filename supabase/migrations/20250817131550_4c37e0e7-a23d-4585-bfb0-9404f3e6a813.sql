-- Fix security vulnerability in profiles table RLS policies
-- Current issue: Profiles table may be exposing sensitive personal data

-- First, let's clean up duplicate policies and create secure ones
DROP POLICY IF EXISTS "Secure profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new secure policies that protect sensitive data

-- SELECT policy: Only allow users to view their own profile, admins to view all profiles,
-- and family managers to view profiles of family members they manage
CREATE POLICY "Users can view accessible profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Users can view their own profile
    auth.uid() = user_id
    OR
    -- Admins can view all profiles
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
    OR
    -- Family managers can view profiles of family members they manage
    EXISTS (
      SELECT 1 FROM public.family_members fm
      JOIN public.profiles p ON p.email = fm.email
      WHERE fm.added_by = auth.uid() 
      AND fm.status = 'active'
      AND p.user_id = profiles.user_id
    )
  )
);

-- INSERT policy: Users can only create their own profile
CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- UPDATE policy: Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- DELETE policy: Users can only delete their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Create a public profile view function that only exposes safe data
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT json_build_object(
    'user_id', user_id,
    'display_name', display_name,
    'avatar_url', avatar_url,
    'bio', CASE 
      WHEN LENGTH(COALESCE(bio, '')) > 200 THEN LEFT(bio, 200) || '...'
      ELSE bio 
    END,
    'created_at', created_at,
    -- Only show these if viewing own profile or if admin
    'first_name', CASE 
      WHEN auth.uid() = user_id OR public.is_user_admin(auth.uid()) 
      THEN first_name 
      ELSE NULL 
    END,
    'last_name', CASE 
      WHEN auth.uid() = user_id OR public.is_user_admin(auth.uid()) 
      THEN last_name 
      ELSE NULL 
    END
    -- Note: email, phone, investment_amount, and other sensitive fields are NOT included
  )
  FROM public.profiles 
  WHERE user_id = target_user_id;
$function$;