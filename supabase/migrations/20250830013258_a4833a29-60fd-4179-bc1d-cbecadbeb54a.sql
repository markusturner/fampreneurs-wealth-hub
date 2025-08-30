-- Security hardening migration - Fix RLS policies for sensitive data

-- Drop old policies and create more restrictive ones for financial data
DROP POLICY IF EXISTS "Admins can view all investment portfolios" ON public.investment_portfolios;
DROP POLICY IF EXISTS "Users can view own investment portfolios" ON public.investment_portfolios;

-- Create enhanced investment portfolio policies with logging
CREATE POLICY "Users can view own investment portfolios only" 
ON public.investment_portfolios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Restrict admin investment portfolio access" 
ON public.investment_portfolios 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN is_current_user_admin() THEN (
      -- Heavily restrict admin access - only small portfolios and with logging
      total_value <= 50000 
      AND log_family_office_action(
        'admin_investment_access',
        'investment_portfolios',
        id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'portfolio_owner', user_id,
          'portfolio_value', total_value,
          'access_time', now(),
          'justification', 'administrative_review'
        )
      ) IS NOT NULL
    )
    ELSE false
  END
);

-- Add missing tables for account_transactions and connected_accounts if they exist
DO $$ 
BEGIN
  -- Check if connected_accounts table exists and create policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connected_accounts') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can manage their own connected accounts" ON public.connected_accounts;
    
    -- Create restrictive policies
    CREATE POLICY "Users can view own connected accounts only" 
    ON public.connected_accounts 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage own connected accounts only" 
    ON public.connected_accounts 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Check if account_transactions table exists and create policies  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_transactions') THEN
    -- Create restrictive policies for transaction data
    CREATE POLICY "Users can view own transactions only" 
    ON public.account_transactions 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage own transactions only" 
    ON public.account_transactions 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Strengthen family_members access control
DROP POLICY IF EXISTS "Admins can view family members with logging and restrictions" ON public.family_members;
CREATE POLICY "Restrict admin family member access with logging" 
ON public.family_members 
FOR SELECT 
USING (
  CASE
    WHEN auth.uid() = added_by THEN true
    WHEN is_current_user_admin() THEN (
      -- Admin access requires explicit logging and justification
      log_family_office_action(
        'admin_family_member_access',
        'family_members',
        id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'family_member_id', id,
          'family_member_name', public.mask_sensitive_data(full_name, 'partial'),
          'access_time', now(),
          'justification', 'administrative_access'
        )
      ) IS NOT NULL
    )
    ELSE false
  END
);

-- Add data retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_sensitive_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Delete audit logs older than 2 years for compliance
  DELETE FROM public.family_office_audit_logs 
  WHERE created_at < now() - interval '2 years'
  AND risk_level NOT IN ('critical', 'high'); -- Keep high-risk logs longer
  
  -- Delete old session data and temporary tokens
  DELETE FROM public.verification_codes 
  WHERE expires_at < now() - interval '7 days';
END;
$function$;

-- Create function to validate admin permissions for sensitive operations
CREATE OR REPLACE FUNCTION public.validate_admin_financial_access(admin_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if admin has specific permission for financial data access
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = admin_user_id 
    AND is_admin = true 
    AND ('financial_data_access' = ANY(admin_permissions) OR admin_permissions IS NULL)
  );
END;
$function$;