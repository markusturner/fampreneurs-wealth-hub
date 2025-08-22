-- Create a secure masked view for UI display of financial accounts
CREATE OR REPLACE VIEW public.connected_accounts_display AS
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
  -- Mask sensitive fields for UI safety
  CASE 
    WHEN plaid_access_token IS NOT NULL THEN '••••••••' || RIGHT(plaid_access_token, 4)
    ELSE NULL 
  END as plaid_token_display,
  CASE 
    WHEN external_account_id IS NOT NULL THEN '••••••••' || RIGHT(external_account_id, 4)
    ELSE NULL 
  END as account_id_display
FROM public.connected_accounts
WHERE user_id = auth.uid();

-- Security barrier prevents data leakage
ALTER VIEW public.connected_accounts_display SET (security_barrier = true);

GRANT SELECT ON public.connected_accounts_display TO authenticated;