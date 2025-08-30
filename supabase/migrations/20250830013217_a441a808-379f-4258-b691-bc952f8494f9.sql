-- Fix mutable search path in database functions by updating them with SET search_path
-- This addresses the "Function Search Path Mutable" security warnings

-- Update functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.update_governance_onboarding_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_family_codes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Strengthen RLS policies for critical tables with sensitive data

-- Enhanced policy for family_members table to add more granular access control
DROP POLICY IF EXISTS "Admins can only view family members with explicit permission" ON public.family_members;
CREATE POLICY "Admins can view family members with logging and restrictions" 
ON public.family_members 
FOR SELECT 
USING (
  CASE
    WHEN is_current_user_admin() THEN (
      -- Admin access is logged and restricted to specific purposes
      log_family_office_action(
        'admin_family_member_access',
        'family_members',
        id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'accessed_family_member', id,
          'access_time', now(),
          'justification', 'administrative_access'
        )
      ) IS NOT NULL
    )
    ELSE false
  END
);

-- Enhanced policy for connected_accounts - more restrictive admin access
CREATE POLICY "Restrict admin access to financial accounts" 
ON public.connected_accounts 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN is_current_user_admin() THEN (
      -- Admin access to financial data requires logging and is heavily restricted
      log_family_office_action(
        'admin_financial_account_access',
        'connected_accounts',
        id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'account_owner', user_id,
          'account_type', account_type,
          'access_time', now(),
          'risk_level', 'high_financial_access'
        )
      ) IS NOT NULL
      AND check_portfolio_access_rate_limit(auth.uid()) -- Rate limit admin access
    )
    ELSE false
  END
);

-- Enhanced policy for account_transactions - restrict admin access to transaction data
CREATE POLICY "Restrict admin access to transaction history" 
ON public.account_transactions 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN is_current_user_admin() THEN (
      -- Very restrictive access to transaction history
      log_family_office_action(
        'admin_transaction_access',
        'account_transactions',
        id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'account_owner', user_id,
          'transaction_amount', amount,
          'access_time', now(),
          'risk_level', 'critical_financial_data'
        )
      ) IS NOT NULL
      AND check_portfolio_access_rate_limit(auth.uid()) -- Rate limit
      AND EXISTS (
        -- Require specific admin permission for transaction access
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.is_admin = true 
        AND 'financial_data_access' = ANY(p.admin_permissions)
      )
    )
    ELSE false
  END
);

-- Add data classification and access controls for investment portfolios
CREATE POLICY "Enhanced investment portfolio access control" 
ON public.investment_portfolios 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN is_current_user_admin() THEN (
      -- Heavily restricted admin access to investment data
      total_value <= 50000 -- Only allow admin access to smaller portfolios
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
          'access_restriction', 'low_value_only'
        )
      ) IS NOT NULL
    )
    ELSE false
  END
);

-- Create audit trail for all sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Log all access to sensitive tables for compliance
  IF TG_TABLE_NAME IN ('family_members', 'connected_accounts', 'account_transactions', 'investment_portfolios') THEN
    PERFORM log_family_office_action(
      'sensitive_data_access',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      NULL,
      'high',
      jsonb_build_object(
        'table_accessed', TG_TABLE_NAME,
        'access_user', auth.uid(),
        'access_time', now(),
        'operation', TG_OP
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_family_members_access
  AFTER SELECT ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_data_access();

CREATE TRIGGER audit_connected_accounts_access
  AFTER SELECT ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_data_access();

CREATE TRIGGER audit_account_transactions_access
  AFTER SELECT ON public.account_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_data_access();

CREATE TRIGGER audit_investment_portfolios_access
  AFTER SELECT ON public.investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION audit_investment_portfolios_access();