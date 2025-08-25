-- Create family voting proposals table
CREATE TABLE public.family_voting_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL DEFAULT 'governance_matter',
  voting_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  voting_options JSONB NOT NULL DEFAULT '["Yes", "No"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family votes table
CREATE TABLE public.family_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.family_voting_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_choice TEXT NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.family_voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_voting_proposals
CREATE POLICY "Users can manage their own voting proposals" 
ON public.family_voting_proposals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view voting proposals" 
ON public.family_voting_proposals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.family_members fm
  WHERE fm.added_by = family_voting_proposals.user_id 
    AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND fm.status = 'active'
));

-- RLS Policies for family_votes
CREATE POLICY "Users can manage their own votes" 
ON public.family_votes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view votes for proposals they can access" 
ON public.family_votes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.family_voting_proposals fvp
  JOIN public.family_members fm ON fm.added_by = fvp.user_id
  WHERE fvp.id = family_votes.proposal_id
    AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    AND fm.status = 'active'
));

-- Create triggers for updated_at
CREATE TRIGGER update_family_voting_proposals_updated_at
BEFORE UPDATE ON public.family_voting_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_votes_updated_at
BEFORE UPDATE ON public.family_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();