-- Create a table for managing office services
CREATE TABLE public.office_services_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE POLICY "Everyone can view default services"
ON public.office_services_catalog
FOR SELECT
USING (is_default = true AND created_by IS NULL);

CREATE POLICY "Admins can manage all services"
ON public.office_services_catalog
FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_office_services_updated_at
  BEFORE UPDATE ON public.office_services_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services (with NULL created_by for system defaults)
INSERT INTO public.office_services_catalog (created_by, name, description, is_default) VALUES
(NULL, 'Investment Management', 'Portfolio and investment oversight', true),
(NULL, 'Tax Planning', 'Tax strategy and compliance', true),
(NULL, 'Estate Planning', 'Estate and succession planning', true),
(NULL, 'Legal Advisory', 'Legal counsel and guidance', true),
(NULL, 'Family Governance', 'Family governance structures', true),
(NULL, 'Wealth Planning', 'Comprehensive wealth strategies', true),
(NULL, 'Risk Management', 'Risk assessment and mitigation', true),
(NULL, 'Philanthropy Advisory', 'Charitable giving guidance', true),
(NULL, 'Business Advisory', 'Business strategy and operations', true),
(NULL, 'Accounting Services', 'Financial accounting and reporting', true),
(NULL, 'Trust Administration', 'Trust management services', true),
(NULL, 'Family Education', 'Educational programs for family members', true),
(NULL, 'Succession Planning', 'Business succession strategies', true),
(NULL, 'Insurance Planning', 'Insurance strategy and management', true),
(NULL, 'Banking Services', 'Banking and credit facilities', true),
(NULL, 'Contract Review', 'Legal document review', true),
(NULL, 'Compliance', 'Regulatory compliance oversight', true),
(NULL, 'Portfolio Management', 'Active portfolio management', true),
(NULL, 'Risk Assessment', 'Risk evaluation and analysis', true),
(NULL, 'Financial Planning', 'Personal financial planning', true),
(NULL, 'Budgeting', 'Budget creation and monitoring', true),
(NULL, 'Cash Flow', 'Cash flow management', true),
(NULL, 'Wills', 'Will preparation and updates', true),
(NULL, 'Trusts', 'Trust structure and management', true),
(NULL, 'Returns', 'Tax return preparation', true),
(NULL, 'Strategy', 'Strategic planning and execution', true),
(NULL, 'Administration', 'Administrative support services', true),
(NULL, 'Support Services', 'General support and assistance', true),
(NULL, 'Investment Research', 'Investment analysis and research', true),
(NULL, 'Market Analysis', 'Market research and analysis', true),
(NULL, 'Charitable Giving', 'Philanthropy execution', true),
(NULL, 'Operations Management', 'Operational oversight', true);