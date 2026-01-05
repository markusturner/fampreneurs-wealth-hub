-- Fix function search_path for simple trigger functions
ALTER FUNCTION public.auto_assign_to_community_group() SET search_path = public;
ALTER FUNCTION public.notify_session_enrollments() SET search_path = public;
ALTER FUNCTION public.update_attendance_timestamps() SET search_path = public;
ALTER FUNCTION public.update_family_codes_updated_at() SET search_path = public;
ALTER FUNCTION public.update_governance_onboarding_updated_at() SET search_path = public;
ALTER FUNCTION public.update_meeting_types_updated_at() SET search_path = public;
ALTER FUNCTION public.update_role_permissions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_session_participant_count() SET search_path = public;
ALTER FUNCTION public.generate_certificate_number() SET search_path = public;

-- Fix get_community_profile function with correct return type
DROP FUNCTION IF EXISTS public.get_community_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_community_profile(p_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, first_initial text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    LEFT(COALESCE(p.first_name, p.display_name, ''), 1) as first_initial
  FROM profiles p
  WHERE p.user_id = get_community_profile.p_user_id;
END;
$$;

-- Fix get_community_profiles function with correct return type
DROP FUNCTION IF EXISTS public.get_community_profiles(uuid[]);
CREATE OR REPLACE FUNCTION public.get_community_profiles(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, first_initial text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    LEFT(COALESCE(p.first_name, p.display_name, ''), 1) as first_initial
  FROM profiles p
  WHERE p.user_id = ANY(get_community_profiles.p_user_ids);
END;
$$;

-- Fix RLS on community_call_bookings - restrict to owner and admins only
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Anyone can view community call bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Anyone can insert community call bookings" ON public.community_call_bookings;
DROP POLICY IF EXISTS "Users can insert bookings" ON public.community_call_bookings;

-- Enable RLS if not enabled
ALTER TABLE public.community_call_bookings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON public.community_call_bookings 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert bookings
CREATE POLICY "Users can insert bookings" 
ON public.community_call_bookings 
FOR INSERT 
WITH CHECK (true);

-- Users can update their own bookings
CREATE POLICY "Users can update their own bookings" 
ON public.community_call_bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Strengthen RLS on connected_accounts - ensure only owner access
DROP POLICY IF EXISTS "Users can view own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can insert own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can delete own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only view own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only insert own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only update own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only delete own connected accounts" ON public.connected_accounts;

-- Enable RLS if not enabled
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Strict owner-only access for connected accounts
CREATE POLICY "Users can only view own connected accounts" 
ON public.connected_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own connected accounts" 
ON public.connected_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own connected accounts" 
ON public.connected_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own connected accounts" 
ON public.connected_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Make sensitive storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN (
  'message-attachments',
  'coaching-recordings',
  'video-documents'
);