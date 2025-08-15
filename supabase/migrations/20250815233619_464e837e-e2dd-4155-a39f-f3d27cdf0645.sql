-- Fix the policy conflict and complete security overhaul

-- 1. Clean up existing family_members policies first
DROP POLICY IF EXISTS "Users can view own added family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can manage family members" ON public.family_members;

-- Recreate secure family_members policies
CREATE POLICY "Users can view family members they manage"
ON public.family_members 
FOR SELECT 
TO authenticated
USING (
  added_by = auth.uid() OR 
  public.is_current_user_admin() OR
  (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

CREATE POLICY "Users can add family members"
ON public.family_members 
FOR INSERT 
TO authenticated
WITH CHECK (added_by = auth.uid());

CREATE POLICY "Admins can manage all family members"
ON public.family_members 
FOR ALL 
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 2. Fix connected_accounts policies
DROP POLICY IF EXISTS "Users can view own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can manage own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can delete their own connected accounts" ON public.connected_accounts;

CREATE POLICY "Users manage own financial accounts"
ON public.connected_accounts 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Fix account_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions only" ON public.account_transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.account_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.account_transactions;

CREATE POLICY "Users can access own transactions"
ON public.account_transactions 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Fix investment_portfolios policies
DROP POLICY IF EXISTS "Users can view own portfolios only" ON public.investment_portfolios;
DROP POLICY IF EXISTS "Users can create their own portfolios" ON public.investment_portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON public.investment_portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON public.investment_portfolios;
DROP POLICY IF EXISTS "Users can view their own portfolios" ON public.investment_portfolios;

CREATE POLICY "Users manage own investment portfolios"
ON public.investment_portfolios 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Ensure RLS is enforced on all sensitive tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.investment_portfolios FORCE ROW LEVEL SECURITY;

-- 6. Handle coaches table properly
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coaches' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.coaches FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Limited coach info for selection" ON public.coaches';
    EXECUTE 'DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage coaches" ON public.coaches';
    
    -- Create secure coach policies
    EXECUTE 'CREATE POLICY "Authenticated users can view active coaches" ON public.coaches FOR SELECT TO authenticated USING (is_active = true)';
    EXECUTE 'CREATE POLICY "Admins can manage coaches" ON public.coaches FOR ALL TO authenticated USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- 7. Handle other tables that might exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'family_documents' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.family_documents FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own family documents" ON public.family_documents';
    EXECUTE 'CREATE POLICY "Users can access own family documents" ON public.family_documents FOR ALL TO authenticated USING (user_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()))';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_advisors' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.financial_advisors FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Financial advisors are viewable by everyone" ON public.financial_advisors';
    EXECUTE 'CREATE POLICY "Authenticated users can view active advisors" ON public.financial_advisors FOR SELECT TO authenticated USING (is_active = true)';
  END IF;
END $$;