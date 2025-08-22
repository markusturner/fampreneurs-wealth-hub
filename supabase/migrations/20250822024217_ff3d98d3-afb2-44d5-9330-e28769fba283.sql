-- Additional security hardening for connected_accounts table

-- 1. Add audit logging for all financial account access
CREATE OR REPLACE FUNCTION public.audit_connected_accounts_access()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    PERFORM public.log_family_office_action(
      'financial_account_accessed',
      'connected_accounts', 
      NEW.id,
      NULL,
      NULL,
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'account_type', NEW.account_type,
        'provider', NEW.provider,
        'access_time', now()
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_family_office_action(
      'financial_account_updated',
      'connected_accounts',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      'high',
      jsonb_build_object('trigger', 'automatic')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp';

-- 2. Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_connected_accounts_access_trigger ON public.connected_accounts;
CREATE TRIGGER audit_connected_accounts_access_trigger
  AFTER SELECT OR UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_connected_accounts_access();

-- 3. Create a secure view that masks sensitive tokens for UI display
CREATE OR REPLACE VIEW public.connected_accounts_safe AS
SELECT 
  id,
  user_id,
  account_name,
  account_type,
  provider,
  balance,
  currency,
  last_sync,
  status,
  created_at,
  updated_at,
  -- Mask sensitive fields for display
  CASE 
    WHEN plaid_access_token IS NOT NULL THEN '****' || RIGHT(plaid_access_token, 4)
    ELSE NULL 
  END as plaid_token_masked,
  CASE 
    WHEN external_account_id IS NOT NULL THEN '****' || RIGHT(external_account_id, 4)
    ELSE NULL 
  END as account_id_masked
FROM public.connected_accounts
WHERE user_id = auth.uid();

-- 4. Ensure RLS on the view
ALTER VIEW public.connected_accounts_safe SET (security_barrier = true);

-- 5. Grant access to authenticated users for the safe view
GRANT SELECT ON public.connected_accounts_safe TO authenticated;