-- Update the RLS policy for community_groups to allow admins to create channels
DROP POLICY IF EXISTS "Users can create groups" ON public.community_groups;

CREATE POLICY "Users can create groups" 
ON public.community_groups 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
);