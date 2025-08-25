-- Fix critical security issues identified in security scan

-- Fix function search_path issues for security
CREATE OR REPLACE FUNCTION public.is_current_user_accountability_partner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(is_accountability_partner, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.update_meeting_types_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create missing tables for enhanced security and functionality
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_type text NOT NULL,
  provider text NOT NULL,
  balance numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active',
  last_sync timestamp with time zone DEFAULT now(),
  plaid_access_token text, -- encrypted sensitive data
  credentials jsonb, -- encrypted sensitive data
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on connected_accounts
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for connected_accounts
CREATE POLICY "Users can only access their own connected accounts"
ON public.connected_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create family_office_privacy_preferences table for enhanced privacy controls
CREATE TABLE IF NOT EXISTS public.family_office_privacy_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_sharing_consent boolean DEFAULT false,
  marketing_emails_consent boolean DEFAULT false,
  analytics_consent boolean DEFAULT true,
  third_party_integrations_consent boolean DEFAULT false,
  data_retention_preference text DEFAULT 'standard',
  export_data_allowed boolean DEFAULT true,
  delete_data_requested boolean DEFAULT false,
  delete_data_requested_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy preferences
ALTER TABLE public.family_office_privacy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own privacy preferences"
ON public.family_office_privacy_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create family_governance_policies table for governance features
CREATE TABLE IF NOT EXISTS public.family_governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  policy_type text NOT NULL CHECK (policy_type IN ('investment', 'spending', 'governance', 'succession', 'other')),
  content jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_date date,
  review_date date,
  approval_required boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on governance policies
ALTER TABLE public.family_governance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view active policies"
ON public.family_governance_policies
FOR SELECT
USING (
  status = 'active' AND (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.added_by = created_by 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  )
);

CREATE POLICY "Policy creators can manage their policies"
ON public.family_governance_policies
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create family_voting_proposals table for voting features
CREATE TABLE IF NOT EXISTS public.family_voting_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  proposal_type text NOT NULL CHECK (proposal_type IN ('policy', 'investment', 'governance', 'spending', 'other')),
  voting_deadline timestamp with time zone NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  requires_unanimous boolean DEFAULT false,
  minimum_participation_percent integer DEFAULT 50 CHECK (minimum_participation_percent BETWEEN 1 AND 100),
  options jsonb NOT NULL DEFAULT '["approve", "reject"]',
  results jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on voting proposals
ALTER TABLE public.family_voting_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view proposals"
ON public.family_voting_proposals
FOR SELECT
USING (
  status IN ('active', 'closed') AND (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.added_by = created_by 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  )
);

CREATE POLICY "Users can create proposals for their family"
ON public.family_voting_proposals
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Proposal creators can manage their proposals"
ON public.family_voting_proposals
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create family_votes table for voting functionality
CREATE TABLE IF NOT EXISTS public.family_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.family_voting_proposals(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_choice text NOT NULL,
  voted_at timestamp with time zone DEFAULT now(),
  notes text,
  UNIQUE(proposal_id, voter_id)
);

-- Enable RLS on votes
ALTER TABLE public.family_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can vote on proposals"
ON public.family_votes
FOR INSERT
WITH CHECK (
  auth.uid() = voter_id AND
  EXISTS (
    SELECT 1 FROM public.family_voting_proposals fvp
    JOIN public.family_members fm ON fm.added_by = fvp.created_by
    WHERE fvp.id = proposal_id
    AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND fm.status = 'active'
    AND fvp.status = 'active'
    AND fvp.voting_deadline > now()
  )
);

CREATE POLICY "Users can view their own votes"
ON public.family_votes
FOR SELECT
USING (auth.uid() = voter_id);

CREATE POLICY "Proposal creators can view all votes on their proposals"
ON public.family_votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_voting_proposals fvp
    WHERE fvp.id = proposal_id AND fvp.created_by = auth.uid()
  )
);

-- Create enhanced notifications table
CREATE TABLE IF NOT EXISTS public.enhanced_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'governance', 'financial', 'family')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  action_required boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on enhanced notifications
ALTER TABLE public.enhanced_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
ON public.enhanced_notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create document_templates table for document management
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('legal', 'financial', 'governance', 'operational', 'other')),
  template_content jsonb NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on document templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates and their own"
ON public.document_templates
FOR SELECT
USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can manage their own templates"
ON public.document_templates
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Add triggers for updated_at fields
CREATE OR REPLACE FUNCTION public.trigger_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add triggers to all tables that need updated_at
CREATE TRIGGER trigger_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trigger_family_office_privacy_preferences_updated_at
  BEFORE UPDATE ON public.family_office_privacy_preferences
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trigger_family_governance_policies_updated_at
  BEFORE UPDATE ON public.family_governance_policies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trigger_family_voting_proposals_updated_at
  BEFORE UPDATE ON public.family_voting_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trigger_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();