-- Re-enable RLS and create a working policy
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and create a simple one that works
DROP POLICY IF EXISTS "Any authenticated user can create groups" ON public.community_groups;

-- Create a policy that uses auth.uid() directly
CREATE POLICY "Authenticated users can create groups"
ON public.community_groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);