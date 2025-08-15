-- Create a secure view for public coach information
-- This provides a way to access only safe, public coach data for booking purposes

CREATE OR REPLACE VIEW public.coaches_public AS
SELECT 
  id,
  full_name,
  specialties,
  years_experience,
  bio,
  is_active,
  created_at,
  -- Explicitly exclude sensitive fields: email, phone, calendar_link
  avatar_url
FROM public.coaches
WHERE is_active = true;

-- Enable RLS on the view (security invoker means it inherits the calling user's permissions)
ALTER VIEW public.coaches_public SET (security_invoker = on);

-- Create a secure function for getting coach booking information
CREATE OR REPLACE FUNCTION public.get_coach_for_booking(coach_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT json_build_object(
    'id', id,
    'full_name', full_name,
    'bio', bio,
    'specialties', specialties,
    'years_experience', years_experience,
    'hourly_rate', hourly_rate,
    'is_active', is_active,
    'avatar_url', avatar_url
    -- Note: email, phone, calendar_link are NOT included for security
  )
  FROM public.coaches 
  WHERE id = coach_id AND is_active = true;
$$;

-- Create a secure function for admins to get full coach details
CREATE OR REPLACE FUNCTION public.get_coach_admin_details(coach_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE 
    WHEN public.is_current_user_admin() THEN
      json_build_object(
        'id', id,
        'full_name', full_name,
        'email', email,
        'phone', phone,
        'bio', bio,
        'specialties', specialties,
        'hourly_rate', hourly_rate,
        'years_experience', years_experience,
        'is_active', is_active,
        'calendar_link', calendar_link,
        'avatar_url', avatar_url,
        'created_at', created_at,
        'updated_at', updated_at
      )
    ELSE
      NULL
  END
  FROM public.coaches 
  WHERE id = coach_id;
$$;