-- Fix infinite recursion in channel_members policy
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Channel members can view memberships" ON channel_members;

-- Create a simpler policy that allows users to view memberships for channels they can access
CREATE POLICY "Users can view channel memberships" 
ON channel_members 
FOR SELECT 
USING (
  -- Users can see memberships for public channels
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_members.channel_id 
    AND NOT channels.is_private
  )
  OR 
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Channel creators can see all memberships in their channels
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_members.channel_id 
    AND channels.created_by = auth.uid()
  )
);