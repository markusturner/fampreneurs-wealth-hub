-- Create office_services_catalog table to support service management in Family Office Member dialog
CREATE TABLE public.office_services_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.office_services_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can manage their own services
CREATE POLICY "Users can manage their own office services"
ON public.office_services_catalog
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can view default services
CREATE POLICY "Users can view default office services"
ON public.office_services_catalog
FOR SELECT
TO authenticated
USING (is_default = true);

-- Admins can view all services
CREATE POLICY "Admins can view all office services"
ON public.office_services_catalog
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_office_services_updated_at
BEFORE UPDATE ON public.office_services_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default services
INSERT INTO public.office_services_catalog (created_by, name, description, is_default, is_active)
VALUES
  (NULL, 'Investment Management', 'Managing investment portfolios and strategies', true, true),
  (NULL, 'Portfolio Management', 'Ongoing management of asset allocations', true, true),
  (NULL, 'Risk Assessment', 'Identify and evaluate financial risks', true, true),
  (NULL, 'Financial Planning', 'Comprehensive financial plans and reviews', true, true),
  (NULL, 'Budgeting', 'Creating and tracking budgets', true, true),
  (NULL, 'Cash Flow', 'Monitoring and optimizing cash flow', true, true),
  (NULL, 'Tax Planning', 'Tax strategy and optimization', true, true),
  (NULL, 'Wills', 'Will drafting and updates', true, true),
  (NULL, 'Trusts', 'Trust setup and administration', true, true),
  (NULL, 'Succession Planning', 'Transition planning for family business', true, true),
  (NULL, 'Family Governance', 'Governance frameworks and councils', true, true),
  (NULL, 'Administration', 'General administration and operations', true, true),
  (NULL, 'Wealth Planning', 'Long-term wealth strategy', true, true),
  (NULL, 'Accounting Services', 'Bookkeeping and accounting support', true, true),
  (NULL, 'Legal Advisory', 'Legal advice and compliance', true, true),
  (NULL, 'Contract Review', 'Contract drafting and review', true, true),
  (NULL, 'Compliance', 'Regulatory and internal compliance', true, true),
  (NULL, 'Investment Research', 'Market research and due diligence', true, true),
  (NULL, 'Market Analysis', 'Macro and sector analysis', true, true),
  (NULL, 'Support Services', 'Executive and admin support', true, true),
  (NULL, 'Risk Management', 'Enterprise risk management', true, true),
  (NULL, 'Insurance Planning', 'Insurance audits and planning', true, true),
  (NULL, 'Philanthropy Advisory', 'Charitable giving strategy', true, true),
  (NULL, 'Charitable Giving', 'Donations and foundation support', true, true),
  (NULL, 'Family Education', 'Education for family members on finance', true, true),
  (NULL, 'Business Advisory', 'Operations and strategy advisory', true, true),
  (NULL, 'Operations Management', 'Business process and ops management', true, true);

-- Helpful indexes
CREATE INDEX idx_office_services_created_by ON public.office_services_catalog(created_by);
CREATE INDEX idx_office_services_active ON public.office_services_catalog(is_active) WHERE is_active = true;