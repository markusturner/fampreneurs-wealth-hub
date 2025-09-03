-- Create office_services_catalog table to support service management in Family Office Member dialog
CREATE TABLE IF NOT EXISTS public.office_services_catalog (
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
-- Users can manage (select/insert/update/delete) their own services
CREATE POLICY IF NOT EXISTS "Users can manage their own office services"
ON public.office_services_catalog
AS PERMISSIVE
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can view default services
CREATE POLICY IF NOT EXISTS "Users can view default office services"
ON public.office_services_catalog
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (is_default = true);

-- Admins can view all services
CREATE POLICY IF NOT EXISTS "Admins can view all office services"
ON public.office_services_catalog
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_office_services_updated_at ON public.office_services_catalog;
CREATE TRIGGER update_office_services_updated_at
BEFORE UPDATE ON public.office_services_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a small curated set of default services (idempotent)
INSERT INTO public.office_services_catalog (created_by, name, description, is_default, is_active)
SELECT NULL, s.name, s.description, true, true
FROM (
  VALUES
    ('Investment Management', 'Managing investment portfolios and strategies'),
    ('Portfolio Management', 'Ongoing management of asset allocations'),
    ('Risk Assessment', 'Identify and evaluate financial risks'),
    ('Financial Planning', 'Comprehensive financial plans and reviews'),
    ('Budgeting', 'Creating and tracking budgets'),
    ('Cash Flow', 'Monitoring and optimizing cash flow'),
    ('Tax Planning', 'Tax strategy and optimization'),
    ('Wills', 'Will drafting and updates'),
    ('Trusts', 'Trust setup and administration'),
    ('Succession Planning', 'Transition planning for family business'),
    ('Family Governance', 'Governance frameworks and councils'),
    ('Administration', 'General administration and operations'),
    ('Wealth Planning', 'Long-term wealth strategy'),
    ('Accounting Services', 'Bookkeeping and accounting support'),
    ('Legal Advisory', 'Legal advice and compliance'),
    ('Contract Review', 'Contract drafting and review'),
    ('Compliance', 'Regulatory and internal compliance'),
    ('Investment Research', 'Market research and due diligence'),
    ('Market Analysis', 'Macro and sector analysis'),
    ('Support Services', 'Executive and admin support'),
    ('Risk Management', 'Enterprise risk management'),
    ('Insurance Planning', 'Insurance audits and planning'),
    ('Philanthropy Advisory', 'Charitable giving strategy'),
    ('Charitable Giving', 'Donations and foundation support'),
    ('Family Education', 'Education for family members on finance'),
    ('Business Advisory', 'Operations and strategy advisory'),
    ('Operations Management', 'Business process and ops management')
) AS s(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.office_services_catalog osc
  WHERE osc.is_default = true AND osc.name = s.name
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_office_services_created_by ON public.office_services_catalog(created_by);
CREATE INDEX IF NOT EXISTS idx_office_services_active ON public.office_services_catalog(is_active) WHERE is_active = true; 
