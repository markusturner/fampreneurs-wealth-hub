-- CRITICAL SECURITY FIX: Remove overly permissive public profile access (Phase 2)
-- This migration fixes the security vulnerability where all user profiles were publicly readable

-- 1. First, remove the dangerous public policy that exposes all profile data
DROP POLICY IF EXISTS "Limited public profile view for community" ON public.profiles;

-- 2. Check if the problematic "Users can view safe community profiles" policy exists and fix it
DROP POLICY IF EXISTS "Users can view safe community profiles" ON public.profiles;

-- 3. Create a secure community profiles policy that restricts data access
CREATE POLICY "Authenticated users can view limited community profiles"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can only see their own full profile, or limited info about others
  (auth.uid() = user_id) OR 
  public.is_current_user_admin()
);

-- 4. Create a secure view for community features that only exposes safe fields
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  created_at,
  -- Only show first name initial for privacy
  CASE 
    WHEN LENGTH(COALESCE(first_name, '')) > 0 THEN LEFT(first_name, 1) || '.'
    ELSE NULL 
  END as first_initial
FROM public.profiles;

-- 5. Grant access to the safe view
GRANT SELECT ON public.safe_profiles TO authenticated;

-- 6. Ensure the is_current_user_admin function exists (recreate if needed)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(is_admin, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$function$;

-- 7. Create function to get safe public profile data (only non-sensitive fields)
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
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
$function$;