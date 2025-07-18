-- Fix infinite recursion in channels table RLS policies
-- The issue is circular dependency between channels and channel_members policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view channel memberships" ON public.channel_members;

-- Recreate channels view policy without circular dependency
CREATE POLICY "Users can view channels" ON public.channels
FOR SELECT
USING (
  -- Public channels are viewable by everyone
  (NOT is_private) 
  OR 
  -- Channel creators can always view their own channels
  (created_by = auth.uid())
);

-- Recreate channel_members view policy without circular dependency  
CREATE POLICY "Users can view channel memberships" ON public.channel_members
FOR SELECT
USING (
  -- Users can see their own memberships
  (user_id = auth.uid())
  OR
  -- Users can see memberships in channels they created
  (EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_members.channel_id 
    AND channels.created_by = auth.uid()
  ))
);

-- Also update the join policy to be simpler
DROP POLICY IF EXISTS "Users can join public channels" ON public.channel_members;

CREATE POLICY "Users can join public channels" ON public.channel_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND 
  (EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_members.channel_id 
    AND NOT channels.is_private
  ))
);