-- Fix RLS policies for family_governance_policies table
-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Family members can view governance policies" ON public.family_governance_policies;

-- Update the main policy to be more explicit and avoid auth.users references
DROP POLICY IF EXISTS "Users can manage their own governance policies" ON public.family_governance_policies;

-- Create a simple, working policy for users to manage their own policies
CREATE POLICY "Users can manage their own governance policies" 
ON public.family_governance_policies 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a separate policy for family members to view policies (without auth.users reference)
CREATE POLICY "Family members can view governance policies" 
ON public.family_governance_policies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm 
    JOIN public.profiles p ON p.email = fm.email 
    WHERE fm.added_by = family_governance_policies.user_id 
    AND fm.status = 'active' 
    AND p.user_id = auth.uid()
  )
);