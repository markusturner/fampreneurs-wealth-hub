-- Remove RLS entirely and let anyone create channels
ALTER TABLE public.community_groups DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.community_groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.community_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.community_groups;
DROP POLICY IF EXISTS "Users can view all groups" ON public.community_groups;