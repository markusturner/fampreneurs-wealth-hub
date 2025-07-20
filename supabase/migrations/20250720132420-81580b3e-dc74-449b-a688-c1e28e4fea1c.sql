-- Drop and recreate the INSERT policy for community_groups to ensure it works correctly
DROP POLICY IF EXISTS "Users can create groups" ON public.community_groups;

-- Create a new, simplified policy for creating groups
CREATE POLICY "Authenticated users can create groups"
ON public.community_groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also ensure the user has a profile (since some functions check profiles)
-- Let's also create a more permissive policy temporarily for debugging
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.community_groups;

CREATE POLICY "Any authenticated user can create groups"
ON public.community_groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());