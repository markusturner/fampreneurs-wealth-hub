-- Fix critical security vulnerability: Family members table publicly accessible
-- This fixes the overly permissive RLS policy that allows anyone to view sensitive family data

-- Drop the existing insecure policy that allows public access
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;

-- Create a secure policy that only allows:
-- 1. The user who added the family member to view it
-- 2. Admins to view all family members
-- 3. The family member themselves if they have credentials and are logged in
CREATE POLICY "Users can view family members they added or manage"
ON public.family_members
FOR SELECT
USING (
  -- User who added the family member can view it
  auth.uid() = added_by
  OR
  -- Admins can view all family members
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  -- Family members can view their own record if they have login credentials
  EXISTS (
    SELECT 1 FROM public.family_member_credentials fmc
    WHERE fmc.email = family_members.email 
    AND fmc.user_id = auth.uid()
    AND fmc.is_active = true
  )
);

-- Ensure the UPDATE policy is also secure (currently allows admins and the person who added them)
-- The existing policies for INSERT and admin management are already secure

-- Log this security fix
SELECT public.log_family_office_action(
  'security_policy_update',
  'family_members',
  NULL,
  jsonb_build_object('old_policy', 'public_access'),
  jsonb_build_object('new_policy', 'restricted_access'),
  'critical',
  jsonb_build_object(
    'issue', 'family_members_publicly_accessible',
    'fix', 'restricted_access_to_authorized_users_only'
  )
);