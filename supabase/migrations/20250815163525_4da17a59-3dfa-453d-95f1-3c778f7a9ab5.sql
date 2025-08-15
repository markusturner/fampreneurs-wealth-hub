-- CRITICAL SECURITY FIX: Secure connected_accounts table
-- This table contains extremely sensitive financial data that must be protected

-- Drop all existing policies to start fresh with secure ones
DROP POLICY IF EXISTS "Users can create their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can delete their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can view their own connected accounts" ON public.connected_accounts;

-- Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create secure policies that require authentication

-- 1. Users can view only their own financial accounts
CREATE POLICY "Users can view own financial accounts"
ON public.connected_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can create their own financial accounts
CREATE POLICY "Users can create own financial accounts"
ON public.connected_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own financial accounts
CREATE POLICY "Users can update own financial accounts"
ON public.connected_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own financial accounts
CREATE POLICY "Users can delete own financial accounts"
ON public.connected_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Admins can view all accounts for support/management purposes
CREATE POLICY "Admins can view all financial accounts"
ON public.connected_accounts
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- 6. Admins can manage all accounts (for support purposes)
CREATE POLICY "Admins can manage all financial accounts"
ON public.connected_accounts
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Add critical security comment
COMMENT ON TABLE public.connected_accounts IS 
'CRITICAL SECURITY TABLE: Contains sensitive financial data including Plaid tokens, account balances, and banking credentials. All access is strictly controlled via RLS policies.';

-- Create secure function for safely retrieving account summary (no sensitive tokens)
CREATE OR REPLACE FUNCTION public.get_account_summary(target_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT json_agg(
    json_build_object(
      'id', id,
      'account_name', account_name,
      'account_type', account_type,
      'provider', provider,
      'balance', balance,
      'currency', currency,
      'status', status,
      'last_sync', last_sync
      -- Note: plaid_access_token, credentials, and other sensitive fields excluded
    )
  )
  FROM public.connected_accounts 
  WHERE user_id = target_user_id
  AND (auth.uid() = target_user_id OR public.is_current_user_admin());
$$;