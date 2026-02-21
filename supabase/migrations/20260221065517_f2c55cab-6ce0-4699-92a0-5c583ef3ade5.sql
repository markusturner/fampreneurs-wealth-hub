-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can manage their own meetings" ON meetings;

-- Create separate SELECT policy that allows community-based access
CREATE POLICY "Users can view meetings" ON meetings
FOR SELECT TO authenticated
USING (
  -- Creator can always see their meetings
  auth.uid() = created_by
  OR
  -- Admins can see all meetings
  is_current_user_admin()
  OR
  -- Events with no community restriction are visible to all authenticated users
  community_ids IS NULL
  OR array_length(community_ids, 1) IS NULL
  OR
  -- Events where user is a member of one of the associated communities
  EXISTS (
    SELECT 1 FROM group_memberships gm
    JOIN community_groups cg ON gm.group_id = cg.id
    WHERE gm.user_id = auth.uid()
    AND (
      (cg.name = 'Family Business University' AND 'fbu' = ANY(community_ids))
      OR (cg.name = 'The Family Vault' AND 'tfv' = ANY(community_ids))
      OR (cg.name = 'The Family Business Accelerator' AND 'tfba' = ANY(community_ids))
      OR (cg.name = 'The Family Fortune Mastermind' AND 'tffm' = ANY(community_ids))
      OR (cg.name = 'The Family Legacy: VIP Weekend' AND 'tflvip' = ANY(community_ids))
    )
  )
);

-- Create separate INSERT policy
CREATE POLICY "Users can insert their own meetings" ON meetings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create separate DELETE policy
CREATE POLICY "Users can delete their own meetings" ON meetings
FOR DELETE TO authenticated
USING (auth.uid() = created_by OR is_current_user_admin());