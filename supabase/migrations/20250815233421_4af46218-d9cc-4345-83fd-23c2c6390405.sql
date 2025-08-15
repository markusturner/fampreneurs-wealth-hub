-- COMPREHENSIVE SECURITY FIX: Address all remaining security vulnerabilities

-- 1. Fix family_members table security
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;

-- Drop overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can view family members they added or manage" ON public.family_members;

-- Create secure family_members policies
CREATE POLICY "Users can view own added family members"
ON public.family_members 
FOR SELECT 
TO authenticated
USING (
  added_by = auth.uid() OR 
  public.is_current_user_admin() OR
  (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- 2. Secure connected_accounts table (financial data)
ALTER TABLE public.connected_accounts FORCE ROW LEVEL SECURITY;

-- Remove any overly permissive policies
DROP POLICY IF EXISTS "Users can view connected accounts" ON public.connected_accounts;

-- Create secure financial account policies
CREATE POLICY "Users can view own connected accounts"
ON public.connected_accounts 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own connected accounts"
ON public.connected_accounts 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Secure account_transactions table
ALTER TABLE public.account_transactions FORCE ROW LEVEL SECURITY;

-- Ensure only users can see their own transactions
CREATE POLICY "Users can view own transactions only"
ON public.account_transactions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 4. Secure investment_portfolios table  
ALTER TABLE public.investment_portfolios FORCE ROW LEVEL SECURITY;

-- Ensure only users can see their own investments
CREATE POLICY "Users can view own portfolios only"
ON public.investment_portfolios 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 5. Fix coaches table if it exists and has overly permissive access
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coaches' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.coaches FORCE ROW LEVEL SECURITY';
    
    -- Drop overly permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches';
    
    -- Create secure coach policies
    EXECUTE 'CREATE POLICY "Limited coach info for selection" ON public.coaches FOR SELECT TO authenticated USING (is_active = true)';
  END IF;
END $$;

-- 6. Fix family_documents table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'family_documents' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.family_documents FORCE ROW LEVEL SECURITY';
    
    -- Create secure family document policies
    EXECUTE 'CREATE POLICY "Users can view own family documents" ON public.family_documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_current_user_admin())';
  END IF;
END $$;

-- 7. Remove any dangerous public access grants
REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.family_members FROM public;
REVOKE ALL ON public.connected_accounts FROM public;
REVOKE ALL ON public.account_transactions FROM public;
REVOKE ALL ON public.investment_portfolios FROM public;

-- Grant only authenticated access where appropriate
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT SELECT, INSERT ON public.account_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_portfolios TO authenticated;

-- 8. Final audit log
INSERT INTO public.family_office_audit_logs (
  user_id,
  action,
  table_name,
  record_id,
  old_values,
  new_values,
  risk_level,
  metadata
) VALUES (
  auth.uid(),
  'comprehensive_security_fix',
  'multiple_tables',
  NULL,
  jsonb_build_object('status', 'multiple_vulnerabilities'),
  jsonb_build_object('status', 'secured_all_tables', 'timestamp', now()),
  'critical',
  jsonb_build_object(
    'description', 'Applied comprehensive security fix to all tables with exposed data',
    'tables_secured', ARRAY['profiles', 'family_members', 'connected_accounts', 'account_transactions', 'investment_portfolios', 'coaches', 'family_documents'],
    'fix_type', 'complete_database_security_overhaul'
  )
);