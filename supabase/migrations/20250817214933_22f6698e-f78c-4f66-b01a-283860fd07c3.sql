-- Fix critical security issue: Block anonymous access to sensitive tables
-- This addresses the security finding about publicly readable customer data

-- 1. Add explicit policy to block anonymous access to subscribers table
CREATE POLICY "Block anonymous access to subscribers" 
ON public.subscribers 
FOR ALL 
TO anon 
USING (false);

-- 2. Add explicit policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false);

-- 3. Add explicit policy to block anonymous access to family_members table
CREATE POLICY "Block anonymous access to family_members" 
ON public.family_members 
FOR ALL 
TO anon 
USING (false);

-- 4. Add explicit policy to block anonymous access to investment_portfolios table
CREATE POLICY "Block anonymous access to investment_portfolios" 
ON public.investment_portfolios 
FOR ALL 
TO anon 
USING (false);

-- 5. Add explicit policy to block anonymous access to bank_statement_uploads table
CREATE POLICY "Block anonymous access to bank_statement_uploads" 
ON public.bank_statement_uploads 
FOR ALL 
TO anon 
USING (false);

-- 6. Add explicit policy to block anonymous access to account_transactions table
CREATE POLICY "Block anonymous access to account_transactions" 
ON public.account_transactions 
FOR ALL 
TO anon 
USING (false);

-- 7. Ensure coaches table has proper access controls
CREATE POLICY "Authenticated users can view coaches" 
ON public.coaches 
FOR SELECT 
TO authenticated 
USING (is_active = true);

CREATE POLICY "Block anonymous access to coaches" 
ON public.coaches 
FOR ALL 
TO anon 
USING (false);

-- 8. Ensure financial_advisors table has proper access controls  
CREATE POLICY "Authenticated users can view active advisors" 
ON public.financial_advisors 
FOR SELECT 
TO authenticated 
USING (is_active = true);

CREATE POLICY "Block anonymous access to financial_advisors" 
ON public.financial_advisors 
FOR ALL 
TO anon 
USING (false);

-- 9. Add missing RLS policies for profiles table (allow users to view their own data)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 10. Add missing RLS policies for family_members table
CREATE POLICY "Users can view family members they added" 
ON public.family_members 
FOR SELECT 
TO authenticated 
USING (auth.uid() = added_by);

CREATE POLICY "Users can update family members they added" 
ON public.family_members 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = added_by) 
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can delete family members they added" 
ON public.family_members 
FOR DELETE 
TO authenticated 
USING (auth.uid() = added_by);