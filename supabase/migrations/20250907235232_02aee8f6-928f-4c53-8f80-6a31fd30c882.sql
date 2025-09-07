-- Step 1: Drop existing functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.log_family_office_action(text,text,uuid,jsonb,jsonb,text,jsonb) CASCADE;

-- Step 2: Remove dangerous admin access policies
DROP POLICY IF EXISTS "Admins can only view family members with explicit permission" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin family member access with logging" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin investment portfolio access" ON public.investment_portfolios;
DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_update_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_insert_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_delete_subscriptions" ON public.subscribers;

-- Step 3: Recreate the log function with proper parameters and search path
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

-- Step 4: Create SECURE policies for sensitive data (NO ADMIN OVERRIDE)

-- Family Members: ONLY the person who added them can access
CREATE POLICY "Secure family members access only"
ON public.family_members
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Investment Portfolios: ONLY the owner can access (NO admin access)
CREATE POLICY "Secure investment data owner only"
ON public.investment_portfolios
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Subscribers: ONLY the subscriber can access (NO admin access)  
CREATE POLICY "Secure subscription data owner only"
ON public.subscribers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);