-- Remove the overly permissive public_community_profile_view policy
DROP POLICY IF EXISTS "public_community_profile_view" ON public.profiles;

-- Ensure profiles table is properly secured with existing policies:
-- 1. users_can_view_own_profile_only - users see only their own data
-- 2. admins_can_view_all_profiles - admins have controlled access
-- 3. Other policies already restrict INSERT/UPDATE/DELETE appropriately

-- Add a secure community profile function that returns only safe, non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_community_profile_safe(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT json_build_object(
    'user_id', user_id,
    'display_name', display_name,
    'avatar_url', avatar_url,
    'created_at', created_at
    -- Note: email, phone, investment_amount, and other sensitive fields are excluded
  )
  FROM public.profiles 
  WHERE user_id = target_user_id 
  AND display_name IS NOT NULL;
$function$;