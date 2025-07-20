-- Temporarily update the policy to allow any authenticated user to create groups for testing
DROP POLICY IF EXISTS "Users can create groups" ON public.community_groups;

CREATE POLICY "Users can create groups" 
ON public.community_groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
);