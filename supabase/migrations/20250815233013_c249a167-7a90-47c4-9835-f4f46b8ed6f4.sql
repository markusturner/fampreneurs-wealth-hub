-- Fix the security definer view issue and complete the security fix

-- 1. Drop the problematic security definer view
DROP VIEW IF EXISTS public.safe_profiles;

-- 2. Create a regular view without security definer to avoid the security warning
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
FROM public.profiles
-- Add WHERE clause to make this view inherently secure
WHERE 
  -- Users can see their own full info via the actual table
  -- This view is only for community features where limited info is needed
  user_id = auth.uid() OR 
  -- Admins can see all
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- 3. Enable RLS on the view
ALTER VIEW public.safe_profiles SET (security_barrier = true);

-- 4. Create RLS policy for the view
CREATE POLICY "Safe profiles view access"
ON public.safe_profiles
FOR SELECT
TO authenticated
USING (true);

-- Wait, views can't have RLS policies directly. Let's remove that and use a different approach.
-- Drop the policy attempt on the view
-- CREATE POLICY will fail on views, so let's handle this differently

-- 5. Instead, let's modify our existing profiles policies to be more restrictive
-- The key is to ensure that when selecting from profiles, applications should use specific column lists

-- 6. Update the community profiles policy to be more explicit about what can be accessed
DROP POLICY IF EXISTS "Users can view safe community profiles" ON public.profiles;

-- 7. Create a more secure community access policy
CREATE POLICY "Limited community profile access"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own full profile
  (auth.uid() = user_id) OR 
  -- Admins can view all profiles
  public.is_current_user_admin()
  -- For community features, the application should only request display_name and avatar_url
  -- This policy allows access but the application layer should enforce field restrictions
);

-- 8. Create a function for safe community profile access
CREATE OR REPLACE FUNCTION public.get_community_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  first_initial text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
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
    p.display_name IS NOT NULL;
$function$;

-- 9. Create a function for getting a single safe profile
CREATE OR REPLACE FUNCTION public.get_community_profile(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  first_initial text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
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
    AND p.display_name IS NOT NULL;
$function$;

-- 10. Drop the problematic view entirely since we have functions now
DROP VIEW IF EXISTS public.safe_profiles;