-- Fix security vulnerability in profiles table RLS policies - Take 2
-- Current issue: Profiles table may be exposing sensitive personal data

-- Get all existing policies on profiles table and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Create new secure policies that protect sensitive data

-- SELECT policy: Restrict access to only authorized viewers
CREATE POLICY "Users can view accessible profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Users can view their own profile
    auth.uid() = user_id
    OR
    -- Admins can view all profiles (but they should use admin functions for sensitive data)
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

-- Update existing public profile functions to be more secure
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
    'created_at', created_at
    -- Note: Sensitive fields like email, phone, investment_amount are NOT included
  )
  FROM public.profiles 
  WHERE user_id = target_user_id;
$function$;

-- Create function for admins to safely access sensitive profile data with audit logging
CREATE OR REPLACE FUNCTION public.get_admin_profile_data(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result json;
BEGIN
  -- Check if current user is admin
  IF NOT public.is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Log admin access to sensitive data
  PERFORM public.log_family_office_action(
    'admin_profile_access',
    'profiles', 
    target_user_id,
    NULL,
    NULL,
    'high',
    jsonb_build_object(
      'accessed_by', auth.uid(),
      'target_user', target_user_id,
      'access_time', now()
    )
  );
  
  -- Return full profile data for admin use
  SELECT json_build_object(
    'user_id', user_id,
    'email', email,
    'first_name', first_name,
    'last_name', last_name,
    'display_name', display_name,
    'phone', phone,
    'investment_amount', investment_amount,
    'backend_cash_collected', backend_cash_collected,
    'avatar_url', avatar_url,
    'bio', bio,
    'occupation', occupation,
    'program_name', program_name,
    'membership_type', membership_type,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO result
  FROM public.profiles 
  WHERE user_id = target_user_id;
  
  RETURN result;
END;
$function$;