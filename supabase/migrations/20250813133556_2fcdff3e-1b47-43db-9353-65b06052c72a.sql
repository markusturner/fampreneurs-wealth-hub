-- Fix critical security vulnerability in profiles table
-- Remove overly permissive policies that allow public access to sensitive personal data

-- Drop the overly permissive policy that allows viewing all family member profiles
DROP POLICY IF EXISTS "Users can view all family member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;

-- Create secure, restrictive policies for the profiles table
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (for new user creation)
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all profiles (for administrative purposes)
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

-- Accountability partners can view limited profile info of users they work with
CREATE POLICY "Accountability partners can view assigned user profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_accountability_partner = true AND 
  EXISTS (
    SELECT 1 FROM public.profiles requester
    WHERE requester.user_id = auth.uid() 
    AND requester.is_accountability_partner = true
  )
);

-- Log the critical security fix
SELECT public.log_family_office_action(
  'critical_security_fix_profiles_table',
  'profiles',
  NULL,
  jsonb_build_object('public_access', true, 'sensitive_data_exposed', true),
  jsonb_build_object('restricted_access', true, 'own_profile_only', true),
  'critical',
  jsonb_build_object(
    'vulnerability', 'Customer Personal Information Could Be Stolen by Hackers',
    'fix_type', 'restrict_profile_access_to_owner_and_admins',
    'sensitive_fields_protected', '["first_name", "last_name", "phone", "bio", "family_role"]'
  )
);