
-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.community_groups;

-- Create a new policy that allows creators, admins, and owners to update
CREATE POLICY "Admins and creators can update groups"
ON public.community_groups FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by 
  OR public.is_current_user_admin() 
  OR public.is_current_user_owner()
)
WITH CHECK (
  auth.uid() = created_by 
  OR public.is_current_user_admin() 
  OR public.is_current_user_owner()
);
