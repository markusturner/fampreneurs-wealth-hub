-- Remove the problematic view entirely and fix the security issue
-- The issue is that views that call security definer functions can bypass RLS

-- Drop the problematic view that's causing the security warning
DROP VIEW IF EXISTS public.community_profiles_secure;

-- Drop the function as it's not needed if we're not using views
DROP FUNCTION IF EXISTS public.get_community_profiles_secure();

-- The community functionality should use the existing secure functions directly
-- rather than through views which can bypass RLS

-- Ensure the can_view_profile function is properly restricted
-- This function needs SECURITY DEFINER to check admin status, but we'll make it safer
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    -- User can view their own profile
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN auth.uid() = target_user_id THEN true
      ELSE (
        -- Check if user is admin (but only if authenticated)
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE user_id = auth.uid() AND is_admin = true
        )
        OR
        -- Check if user is family manager for this profile
        EXISTS (
          SELECT 1 FROM public.family_members fm
          JOIN public.profiles p ON p.email = fm.email
          WHERE fm.added_by = auth.uid() 
          AND fm.status = 'active'
          AND p.user_id = target_user_id
        )
      )
    END;
$$;

-- Create a comment explaining why this function needs SECURITY DEFINER
COMMENT ON FUNCTION public.can_view_profile(uuid) IS 
'This function requires SECURITY DEFINER to check admin status and family relationships. 
It is used only in RLS policies and includes proper authentication checks to prevent misuse.';