-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can view memberships for groups they belong to" ON public.group_memberships;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = $1 
    AND group_memberships.user_id = $2
  );
$$;

CREATE OR REPLACE FUNCTION public.can_join_group(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_groups
    WHERE community_groups.id = $1 
    AND NOT community_groups.is_private
  ) OR EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = $1
    AND group_memberships.user_id = $2
    AND group_memberships.role IN ('admin', 'moderator')
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can join groups they have permission for"
ON public.group_memberships
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.can_join_group(group_id, auth.uid())
);

CREATE POLICY "Users can view group memberships"
ON public.group_memberships
FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
);