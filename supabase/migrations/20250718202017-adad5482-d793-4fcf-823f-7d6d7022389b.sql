-- Fix the channels policy that might be causing infinite recursion
DROP POLICY IF EXISTS "Users can view public channels" ON public.channels;

-- Create a simpler, non-recursive policy for viewing channels
CREATE POLICY "Users can view channels"
ON public.channels
FOR SELECT
USING (
  NOT is_private 
  OR 
  created_by = auth.uid()
  OR
  id IN (
    SELECT channel_id 
    FROM channel_members 
    WHERE user_id = auth.uid()
  )
);