-- Fix security policies for coaches and financial_advisors tables with correct column names

-- Enable RLS on both tables
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_advisors ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches;
DROP POLICY IF EXISTS "Public can view coaches" ON public.coaches;
DROP POLICY IF EXISTS "Authenticated users can view coaches" ON public.coaches;
DROP POLICY IF EXISTS "Coaches can manage their own profile" ON public.coaches;
DROP POLICY IF EXISTS "Admins can manage all coaches" ON public.coaches;

DROP POLICY IF EXISTS "Financial advisors are viewable by everyone" ON public.financial_advisors;
DROP POLICY IF EXISTS "Public can view financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Authenticated users can view financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Financial advisors can manage their own profile" ON public.financial_advisors;
DROP POLICY IF EXISTS "Admins can manage all financial advisors" ON public.financial_advisors;

-- Create secure policies for coaches (restrict to authenticated users only)
CREATE POLICY "Authenticated users can view coaches"
ON public.coaches
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage coaches they added"
ON public.coaches
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Admins can manage all coaches"
ON public.coaches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Create secure policies for financial_advisors (restrict to authenticated users only)
CREATE POLICY "Authenticated users can view financial advisors"
ON public.financial_advisors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage financial advisors they added"
ON public.financial_advisors
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Admins can manage all financial advisors"
ON public.financial_advisors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Log the security fixes
SELECT public.log_family_office_action(
  'security_policies_fixed',
  'coaches_financial_advisors',
  NULL,
  jsonb_build_object('public_access', true),
  jsonb_build_object('authenticated_access_only', true),
  'critical',
  jsonb_build_object(
    'tables_secured', '["coaches", "financial_advisors"]',
    'fix_type', 'restrict_to_authenticated_users_only'
  )
);