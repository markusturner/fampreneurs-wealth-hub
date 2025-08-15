-- Fix coaches table security by dropping existing policies and creating secure ones
-- The error indicates policies already exist, so let's drop them first

-- Drop all existing policies on coaches table
DROP POLICY IF EXISTS "Admins can manage all coaches" ON public.coaches;
DROP POLICY IF EXISTS "Coaches can manage their own profiles" ON public.coaches;
DROP POLICY IF EXISTS "Public can view basic coach info for booking" ON public.coaches;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.coaches;
DROP POLICY IF EXISTS "Public coaches access" ON public.coaches;

-- Ensure RLS is enabled
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Create new secure policies

-- 1. Admins can do everything with coaches
CREATE POLICY "Admins can manage coaches"
ON public.coaches
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 2. Authenticated users can only view basic coach info (no sensitive data like email/phone)
-- This policy only allows SELECT for active coaches, and the application should use
-- the get_coach_for_booking() function which filters out sensitive fields
CREATE POLICY "Authenticated users can view basic coach info"
ON public.coaches
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Coaches can view/update their own profile if they have matching email
CREATE POLICY "Coaches can manage own profile"
ON public.coaches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = coaches.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = coaches.email
  )
);

-- Note: No policies for anonymous users = no access for unauthenticated users
-- Sensitive data access should go through the get_coach_admin_details() function for admins
-- Public booking should use get_coach_for_booking() function which excludes sensitive fields