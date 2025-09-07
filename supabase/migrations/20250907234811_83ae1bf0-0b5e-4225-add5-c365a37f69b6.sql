-- Fix critical security vulnerabilities - Part 1: Drop and recreate functions with proper search paths

-- 1. Drop existing functions that need to be recreated
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text, text);

-- 2. Recreate functions with proper search paths
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data_value text, mask_type text DEFAULT 'partial')
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT CASE 
    WHEN mask_type = 'partial' AND length(data_value) > 4 THEN 
      left(data_value, 2) || '***' || right(data_value, 2)
    WHEN mask_type = 'full' THEN '***'
    ELSE data_value
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_family_office_action(
  action_name text,
  table_name text,
  record_id uuid,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL,
  risk_level text DEFAULT 'medium',
  metadata jsonb DEFAULT '{}'
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  INSERT INTO public.family_office_audit_logs 
  (user_id, action, table_name, record_id, old_values, new_values, risk_level, metadata)
  VALUES (auth.uid(), action_name, table_name, record_id, old_values, new_values, risk_level, metadata)
  RETURNING id;
$$;

-- 3. Remove dangerous admin access policies for family_members table
DROP POLICY IF EXISTS "Admins can only view family members with explicit permission" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin family member access with logging" ON public.family_members;

-- Create secure family_members policy - only family office owners can access
CREATE POLICY "Secure family office owners access only"
ON public.family_members
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- 4. Remove dangerous admin access to investment portfolios
DROP POLICY IF EXISTS "Restrict admin investment portfolio access" ON public.investment_portfolios;

-- Create secure investment portfolio policy - NO admin access to financial data
CREATE POLICY "Secure users own portfolios only"
ON public.investment_portfolios
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);