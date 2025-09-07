-- Fix critical security vulnerabilities - Complete security overhaul

-- Step 1: Remove ALL dangerous admin access policies first
DROP POLICY IF EXISTS "Admins can only view family members with explicit permission" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin family member access with logging" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin investment portfolio access" ON public.investment_portfolios;
DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_update_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_insert_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_delete_subscriptions" ON public.subscribers;

-- Step 2: Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text, text) CASCADE;

-- Step 3: Recreate all functions with proper search paths
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

-- Step 4: Create SECURE policies for sensitive data tables

-- Family Members: ONLY family office owners can access their own members
CREATE POLICY "Secure family members access"
ON public.family_members
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Investment Portfolios: ONLY users can access their own portfolios (NO admin access)
CREATE POLICY "Secure investment portfolios access"
ON public.investment_portfolios
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Subscribers: ONLY users can access their own subscription data (NO admin access)
CREATE POLICY "Secure subscriber data access"
ON public.subscribers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 5: Secure coaches and financial advisors tables if they exist
DO $$
BEGIN
  -- Secure coaches table - restrict contact info visibility
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaches') THEN
    DROP POLICY IF EXISTS "Authenticated users can view coaches" ON public.coaches;
    EXECUTE 'CREATE POLICY "Restricted coach access"
    ON public.coaches
    FOR SELECT
    USING (
      auth.uid() = created_by OR 
      EXISTS (
        SELECT 1 FROM coaching_sessions 
        WHERE coach_id = coaches.id AND user_id = auth.uid()
      )
    )';
  END IF;
  
  -- Secure financial advisors table - restrict contact info
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_advisors') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active advisors" ON public.financial_advisors;
    EXECUTE 'CREATE POLICY "Restricted financial advisor access"
    ON public.financial_advisors  
    FOR SELECT
    USING (
      auth.uid() = added_by OR
      EXISTS (
        SELECT 1 FROM advisor_assignments 
        WHERE advisor_id = financial_advisors.id AND user_id = auth.uid()
      )
    )';
  END IF;
END $$;

-- Step 6: Add enhanced audit logging for all sensitive operations
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Log any access to sensitive financial or family data
  IF TG_TABLE_NAME IN ('family_members', 'investment_portfolios', 'subscribers') THEN
    INSERT INTO public.family_office_audit_logs 
    (user_id, action, table_name, record_id, old_values, new_values, risk_level, metadata)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      'high',
      jsonb_build_object(
        'timestamp', now(),
        'operation', TG_OP,
        'security_context', 'enhanced_audit'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to ALL sensitive tables
DROP TRIGGER IF EXISTS secure_audit_family_members ON public.family_members;
CREATE TRIGGER secure_audit_family_members
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS secure_audit_investment_portfolios ON public.investment_portfolios;  
CREATE TRIGGER secure_audit_investment_portfolios
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS secure_audit_subscribers ON public.subscribers;
CREATE TRIGGER secure_audit_subscribers
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers  
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();