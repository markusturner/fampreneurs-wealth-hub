-- Fix remaining RLS policy conflicts and add missing security controls
-- This resolves conflicts in policies and adds proper access controls

-- 1. Create table for connected_accounts if it doesn't exist and add proper RLS
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_name text,
    account_type text,
    provider text,
    balance numeric DEFAULT 0,
    currency text DEFAULT 'USD',
    status text DEFAULT 'connected',
    plaid_access_token text, -- This should be encrypted in production
    credentials jsonb, -- This should be encrypted in production
    last_sync timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on connected_accounts
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Add policies for connected_accounts
CREATE POLICY "Users can manage their own connected accounts" 
ON public.connected_accounts 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block anonymous access to connected_accounts" 
ON public.connected_accounts 
FOR ALL 
TO anon 
USING (false);

-- 2. Create table for user_2fa_settings if it doesn't exist and add proper RLS
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_enabled boolean DEFAULT false,
    secret_key text, -- This should be encrypted in production
    backup_codes text[], -- These should be encrypted in production
    phone_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_2fa_settings
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Add policies for user_2fa_settings
CREATE POLICY "Users can manage their own 2FA settings" 
ON public.user_2fa_settings 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block anonymous access to user_2fa_settings" 
ON public.user_2fa_settings 
FOR ALL 
TO anon 
USING (false);

-- 3. Remove conflicting policies on profiles table to avoid policy conflicts
DROP POLICY IF EXISTS "profiles_select_self_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_profiles" ON public.profiles;

-- 4. Ensure admins can still manage all data (but only admins)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "Admins can view all family members" 
ON public.family_members 
FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "Admins can view all connected accounts" 
ON public.connected_accounts 
FOR SELECT 
TO authenticated 
USING (is_current_user_admin());

-- 5. Add trigger to update timestamps on connected_accounts
CREATE OR REPLACE FUNCTION public.update_connected_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_connected_accounts_updated_at();

-- 6. Add trigger to update timestamps on user_2fa_settings
CREATE OR REPLACE FUNCTION public.update_user_2fa_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_2fa_settings_updated_at();