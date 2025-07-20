-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin_for_groups()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop and recreate the policy using the function
DROP POLICY IF EXISTS "Users can create groups" ON public.community_groups;

CREATE POLICY "Users can create groups" 
ON public.community_groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  public.is_user_admin_for_groups()
);