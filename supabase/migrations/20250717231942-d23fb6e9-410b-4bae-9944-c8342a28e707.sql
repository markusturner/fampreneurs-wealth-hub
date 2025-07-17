-- Fix infinite recursion in user_roles policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins and billing managers can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Create new policies that avoid circular references
-- Only check profiles.is_admin directly to avoid recursion
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

-- Allow users to view roles but limit sensitive operations
CREATE POLICY "Users can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (true);

-- Allow users to manage their own basic member role
CREATE POLICY "Users can manage their own member role" 
ON public.user_roles 
FOR ALL 
USING (
  user_id = auth.uid() 
  AND role = 'member'
) 
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'member'
);