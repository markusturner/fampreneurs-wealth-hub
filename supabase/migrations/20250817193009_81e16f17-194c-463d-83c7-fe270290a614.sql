-- Fix critical security vulnerability in financial_advisors table
-- First drop all existing policies, then create secure ones

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view all financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Authenticated users can view financial advisors" ON public.financial_advisors; 
DROP POLICY IF EXISTS "Authenticated users can view active advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can add financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can manage financial advisors they added" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can update advisors they added" ON public.financial_advisors;
DROP POLICY IF EXISTS "Admins can manage all financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "secure_view_financial_advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "secure_insert_financial_advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "secure_update_financial_advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "secure_delete_financial_advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "admin_manage_all_financial_advisors" ON public.financial_advisors;

-- Create new secure policies

-- Only allow viewing by user who added advisor or admins
CREATE POLICY "restricted_view_financial_advisors" ON public.financial_advisors
FOR SELECT 
TO authenticated
USING (
  auth.uid() = added_by OR 
  public.is_current_user_admin()
);

-- Only authenticated users can add advisors they own
CREATE POLICY "restricted_insert_financial_advisors" ON public.financial_advisors
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = added_by);

-- Only owner can update
CREATE POLICY "restricted_update_financial_advisors" ON public.financial_advisors
FOR UPDATE 
TO authenticated
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Only owner or admin can delete
CREATE POLICY "restricted_delete_financial_advisors" ON public.financial_advisors
FOR DELETE 
TO authenticated
USING (
  auth.uid() = added_by OR 
  public.is_current_user_admin()
);