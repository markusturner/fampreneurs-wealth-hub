-- Create a table for managing office services
CREATE TABLE public.office_services_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(created_by, name)
);

-- Enable RLS
ALTER TABLE public.office_services_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own services"
ON public.office_services_catalog
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can view all services"
ON public.office_services_catalog
FOR SELECT
USING (is_current_user_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_office_services_updated_at
  BEFORE UPDATE ON public.office_services_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services
INSERT INTO public.office_services_catalog (created_by, name, description, is_default) VALUES
(gen_random_uuid(), 'Investment Management', 'Portfolio and investment oversight', true),
(gen_random_uuid(), 'Tax Planning', 'Tax strategy and compliance', true),
(gen_random_uuid(), 'Estate Planning', 'Estate and succession planning', true),
(gen_random_uuid(), 'Legal Advisory', 'Legal counsel and guidance', true),
(gen_random_uuid(), 'Family Governance', 'Family governance structures', true),
(gen_random_uuid(), 'Wealth Planning', 'Comprehensive wealth strategies', true),
(gen_random_uuid(), 'Risk Management', 'Risk assessment and mitigation', true),
(gen_random_uuid(), 'Philanthropy Advisory', 'Charitable giving guidance', true),
(gen_random_uuid(), 'Business Advisory', 'Business strategy and operations', true),
(gen_random_uuid(), 'Accounting Services', 'Financial accounting and reporting', true),
(gen_random_uuid(), 'Trust Administration', 'Trust management services', true),
(gen_random_uuid(), 'Family Education', 'Educational programs for family members', true),
(gen_random_uuid(), 'Succession Planning', 'Business succession strategies', true),
(gen_random_uuid(), 'Insurance Planning', 'Insurance strategy and management', true),
(gen_random_uuid(), 'Banking Services', 'Banking and credit facilities', true),
(gen_random_uuid(), 'Contract Review', 'Legal document review', true),
(gen_random_uuid(), 'Compliance', 'Regulatory compliance oversight', true),
(gen_random_uuid(), 'Portfolio Management', 'Active portfolio management', true),
(gen_random_uuid(), 'Risk Assessment', 'Risk evaluation and analysis', true),
(gen_random_uuid(), 'Financial Planning', 'Personal financial planning', true),
(gen_random_uuid(), 'Budgeting', 'Budget creation and monitoring', true),
(gen_random_uuid(), 'Cash Flow', 'Cash flow management', true),
(gen_random_uuid(), 'Wills', 'Will preparation and updates', true),
(gen_random_uuid(), 'Trusts', 'Trust structure and management', true),
(gen_random_uuid(), 'Returns', 'Tax return preparation', true),
(gen_random_uuid(), 'Strategy', 'Strategic planning and execution', true),
(gen_random_uuid(), 'Administration', 'Administrative support services', true),
(gen_random_uuid(), 'Support Services', 'General support and assistance', true),
(gen_random_uuid(), 'Investment Research', 'Investment analysis and research', true),
(gen_random_uuid(), 'Market Analysis', 'Market research and analysis', true),
(gen_random_uuid(), 'Charitable Giving', 'Philanthropy execution', true),
(gen_random_uuid(), 'Operations Management', 'Operational oversight', true);