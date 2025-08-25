-- Check and fix RLS policies for family voting proposals and votes

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can manage their own voting proposals" ON public.family_voting_proposals;
DROP POLICY IF EXISTS "Family members can view voting proposals" ON public.family_voting_proposals;
DROP POLICY IF EXISTS "Users can manage their own votes" ON public.family_votes;
DROP POLICY IF EXISTS "Family members can view votes for proposals they can access" ON public.family_votes;

-- Create comprehensive RLS policies for family_voting_proposals
CREATE POLICY "Users can manage their own voting proposals" 
ON public.family_voting_proposals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view voting proposals" 
ON public.family_voting_proposals 
FOR SELECT 
USING (
  -- Allow proposal creator to see their own proposals
  auth.uid() = user_id
  OR
  -- Allow family members added by the proposal creator to see proposals
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = family_voting_proposals.user_id 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND fm.status = 'active'
  )
);

-- Create comprehensive RLS policies for family_votes
CREATE POLICY "Users can manage their own votes" 
ON public.family_votes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view votes for accessible proposals" 
ON public.family_votes 
FOR SELECT 
USING (
  -- Users can see their own votes
  auth.uid() = user_id
  OR
  -- Users can see votes on proposals they created
  EXISTS (
    SELECT 1 FROM public.family_voting_proposals fvp
    WHERE fvp.id = family_votes.proposal_id
      AND fvp.user_id = auth.uid()
  )
  OR
  -- Family members can see votes on proposals they can access
  EXISTS (
    SELECT 1 FROM public.family_voting_proposals fvp
    JOIN public.family_members fm ON fm.added_by = fvp.user_id
    WHERE fvp.id = family_votes.proposal_id
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND fm.status = 'active'
  )
);