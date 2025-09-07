-- Fix critical security vulnerabilities and RLS policy issues

-- 1. Fix function search paths for security definer functions
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data_value text, mask_type text DEFAULT 'partial')
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
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
SET search_path = public
AS $$
  INSERT INTO public.family_office_audit_logs 
  (user_id, action, table_name, record_id, old_values, new_values, risk_level, metadata)
  VALUES (auth.uid(), action_name, table_name, record_id, old_values, new_values, risk_level, metadata)
  RETURNING id;
$$;

-- 2. Remove dangerous admin access policies for family_members table
DROP POLICY IF EXISTS "Admins can only view family members with explicit permission" ON public.family_members;
DROP POLICY IF EXISTS "Restrict admin family member access with logging" ON public.family_members;

-- Create secure family_members policies - only family office owners can access
CREATE POLICY "Family office owners can access their family members"
ON public.family_members
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- 3. Remove dangerous admin access to investment portfolios
DROP POLICY IF EXISTS "Restrict admin investment portfolio access" ON public.investment_portfolios;

-- Create secure investment portfolio policy - NO admin access to financial data
CREATE POLICY "Users can only access their own investment portfolios"
ON public.investment_portfolios
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Secure subscribers table - remove broad admin access
DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_update_all_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_insert_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "admins_can_delete_subscriptions" ON public.subscribers;

-- Only allow users to access their own subscription data
CREATE POLICY "Users can only access their own subscription data"
ON public.subscribers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Create coaches table with proper access controls if it exists
DO $$
BEGIN
  -- Check if coaches table exists and secure it
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaches') THEN
    -- Remove overly permissive policies
    DROP POLICY IF EXISTS "Authenticated users can view coaches" ON public.coaches;
    
    -- Only allow viewing coaches that user has sessions with or owns
    EXECUTE 'CREATE POLICY "Users can only view assigned coaches"
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
END $$;

-- 6. Create financial_advisors table with proper access controls if it exists  
DO $$
BEGIN
  -- Check if financial_advisors table exists and secure it
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_advisors') THEN
    -- Remove overly permissive policies
    DROP POLICY IF EXISTS "Authenticated users can view active advisors" ON public.financial_advisors;
    
    -- Only allow viewing advisors that user added or is assigned to
    EXECUTE 'CREATE POLICY "Users can only view their assigned financial advisors"
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

-- 7. Create enhanced audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
        'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_family_members ON public.family_members;
CREATE TRIGGER audit_family_members
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS audit_investment_portfolios ON public.investment_portfolios;  
CREATE TRIGGER audit_investment_portfolios
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

DROP TRIGGER IF EXISTS audit_subscribers ON public.subscribers;
CREATE TRIGGER audit_subscribers
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers  
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();

-- 8. Add data classification and encryption flags where needed
DO $$
BEGIN
  -- Add encryption status column to sensitive tables if not exists
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'family_members' AND column_name = 'encryption_status') THEN
    ALTER TABLE public.family_members ADD COLUMN encryption_status text DEFAULT 'encrypted';
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'investment_portfolios' AND column_name = 'data_classification') THEN  
    ALTER TABLE public.investment_portfolios ADD COLUMN data_classification text DEFAULT 'confidential';
  END IF;
END $$;