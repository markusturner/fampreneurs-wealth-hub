-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Create family governance policies table
CREATE TABLE IF NOT EXISTS public.family_governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('investment', 'spending', 'governance', 'succession', 'philanthropy')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create family voting proposals table
CREATE TABLE IF NOT EXISTS public.family_voting_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('policy_change', 'investment_decision', 'governance_matter', 'other')),
  voting_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  voting_options JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create family votes table
CREATE TABLE IF NOT EXISTS public.family_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.family_voting_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_choice TEXT NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- Create enhanced notifications table
CREATE TABLE IF NOT EXISTS public.enhanced_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('system', 'governance', 'investment', 'document', 'meeting', 'alert')),
  title TEXT NOT NULL,
  message TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,
  reference_id UUID,
  reference_table TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create document templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('legal', 'financial', 'governance', 'operational')),
  template_content JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.family_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_voting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_governance_policies
CREATE POLICY "Users can manage their own governance policies" ON public.family_governance_policies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view governance policies" ON public.family_governance_policies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm 
      WHERE fm.added_by = family_governance_policies.user_id 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  );

-- Create RLS policies for family_voting_proposals
CREATE POLICY "Users can manage their own voting proposals" ON public.family_voting_proposals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view voting proposals" ON public.family_voting_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm 
      WHERE fm.added_by = family_voting_proposals.user_id 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  );

-- Create RLS policies for family_votes
CREATE POLICY "Users can manage their own votes" ON public.family_votes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view votes on proposals they can access" ON public.family_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_voting_proposals fvp
      JOIN public.family_members fm ON fm.added_by = fvp.user_id
      WHERE fvp.id = family_votes.proposal_id
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  );

-- Create RLS policies for enhanced_notifications
CREATE POLICY "Users can manage their own notifications" ON public.enhanced_notifications
  FOR ALL USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- Create RLS policies for document_templates
CREATE POLICY "Users can manage their own document templates" ON public.document_templates
  FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family members can view document templates" ON public.document_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm 
      WHERE fm.added_by = document_templates.created_by 
      AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND fm.status = 'active'
    )
  );

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('family-documents', 'family-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false) ON CONFLICT DO NOTHING;

-- Create storage policies for family-documents bucket
CREATE POLICY "Users can upload their own family documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own family documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own family documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own family documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for document-templates bucket
CREATE POLICY "Users can upload document templates" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view document templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'document-templates');

CREATE POLICY "Users can update their own document templates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own document templates" ON storage.objects
  FOR DELETE USING (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_governance_policies_updated_at
  BEFORE UPDATE ON public.family_governance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_voting_proposals_updated_at
  BEFORE UPDATE ON public.family_voting_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_notifications_updated_at
  BEFORE UPDATE ON public.enhanced_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();