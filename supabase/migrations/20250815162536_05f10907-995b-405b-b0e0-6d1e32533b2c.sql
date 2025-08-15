-- Fix coaches table security vulnerabilities
-- Remove overly permissive policies and implement secure access control

-- Drop problematic policies
DROP POLICY IF EXISTS "Authenticated users can view coaches" ON public.coaches;
DROP POLICY IF EXISTS "Admins can manage all coaches" ON public.coaches;

-- Create secure policies for coaches table

-- 1. Only authenticated users can view coaches, but with restrictions
-- This allows for coach selection while protecting personal details in application layer
CREATE POLICY "Authenticated users can view coach profiles"
ON public.coaches
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Admins can view all coaches (including inactive) using security definer function
CREATE POLICY "Admins can view all coaches"
ON public.coaches
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- 3. Admins can manage all coaches using security definer function
CREATE POLICY "Admins can manage all coaches"
ON public.coaches
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 4. Coaches can view and update their own profile if they have user accounts
-- This assumes coaches might have user accounts linked by email
CREATE POLICY "Coaches can view own profile"
ON public.coaches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = coaches.email
  )
);

CREATE POLICY "Coaches can update own profile"
ON public.coaches
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = coaches.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = coaches.email
  )
);

-- Add a comment explaining the security consideration
COMMENT ON POLICY "Authenticated users can view coach profiles" ON public.coaches IS 
'This policy allows authenticated users to view coach profiles for booking purposes. Application code should filter sensitive fields (email, phone) in non-admin contexts.';