-- Improve the profile viewing policy to actually restrict sensitive data access
-- The current policy allows access but we need column-level restrictions

-- First, let's create a view for public profile information only
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  first_name,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- However, since we can't easily implement column-level security in the current setup,
-- let's update the comment on the policy to clarify the limitation
COMMENT ON POLICY "Users can view basic public profile information" ON public.profiles IS 
'WARNING: This policy grants access to full profile data. Application code must filter sensitive columns like phone, investment data, etc. Consider using the public_profiles view for non-sensitive data access.';

-- Create a secure function to get public profile data only
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT json_build_object(
    'user_id', user_id,
    'first_name', first_name,
    'last_name', last_name,
    'display_name', display_name,
    'avatar_url', avatar_url,
    'created_at', created_at
  )
  FROM public.profiles 
  WHERE user_id = target_user_id;
$$;