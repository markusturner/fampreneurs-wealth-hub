-- Fix security issues identified in the security scan

-- First, let's fix any functions that might be missing search_path
-- Update any custom functions that don't have proper search_path set

-- Fix RLS policies for critical data exposure issues
-- Ensure family_members table has proper RLS policies
DROP POLICY IF EXISTS "Block anonymous access to family_members" ON public.family_members;
CREATE POLICY "Authenticated users only can access family_members" ON public.family_members
FOR ALL USING (auth.uid() IS NOT NULL);

-- Ensure subscribers table has proper RLS policies  
DROP POLICY IF EXISTS "require_authenticated_for_any_access" ON public.subscribers;
CREATE POLICY "Authenticated users can only access own subscription data" ON public.subscribers
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure investment_portfolios has proper RLS policies (should already exist but let's verify)
DROP POLICY IF EXISTS "Block anonymous access to investment_portfolios" ON public.investment_portfolios;
CREATE POLICY "Authenticated users can only access own investment data" ON public.investment_portfolios
FOR ALL USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Add additional security function for admin checks with proper search_path
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Update any existing functions that might be missing search_path
-- Check and update the update_updated_at_column function if it exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Ensure all critical tables have proper RLS enabled
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_office_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add function to check family office access with proper search_path
CREATE OR REPLACE FUNCTION public.is_family_office_only_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_id 
      AND p.email = fm.email 
      AND fm.family_position = 'Family Office Team'
    )
  );
END;
$$;