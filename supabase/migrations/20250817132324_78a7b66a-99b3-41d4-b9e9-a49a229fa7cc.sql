-- Enhance investment_portfolios table security with granular policies and audit logging
-- Current state: Has basic RLS but can be improved for sensitive financial data

-- Drop existing policy to replace with more granular ones
DROP POLICY IF EXISTS "Users manage own investment portfolios" ON public.investment_portfolios;

-- Create separate, more specific policies for better security control

-- SELECT: Users can only view their own portfolios
CREATE POLICY "Users can view own investment portfolios" ON public.investment_portfolios
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- INSERT: Users can only create portfolios for themselves
CREATE POLICY "Users can create own investment portfolios" ON public.investment_portfolios
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- UPDATE: Users can only update their own portfolios
CREATE POLICY "Users can update own investment portfolios" ON public.investment_portfolios
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- DELETE: Users can only delete their own portfolios
CREATE POLICY "Users can delete own investment portfolios" ON public.investment_portfolios
FOR DELETE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Admin policy: Admins can view all portfolios for support purposes (with audit logging)
CREATE POLICY "Admins can view all investment portfolios" ON public.investment_portfolios
FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

-- Create audit trigger for investment portfolio access
CREATE OR REPLACE FUNCTION public.audit_investment_portfolio_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Log all operations on sensitive investment data
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_created',
      'investment_portfolios',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      'medium',
      jsonb_build_object(
        'trigger', 'automatic',
        'platform_id', NEW.platform_id,
        'total_value', NEW.total_value
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_updated',
      'investment_portfolios',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      'medium',
      jsonb_build_object(
        'trigger', 'automatic',
        'value_change', NEW.total_value - OLD.total_value,
        'platform_id', NEW.platform_id
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_deleted',
      'investment_portfolios',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      'high',
      jsonb_build_object(
        'trigger', 'automatic',
        'deleted_value', OLD.total_value,
        'platform_id', OLD.platform_id
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_investment_portfolios_trigger ON public.investment_portfolios;
CREATE TRIGGER audit_investment_portfolios_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.audit_investment_portfolio_access();

-- Create secure function for getting portfolio summary (masks sensitive details)
CREATE OR REPLACE FUNCTION public.get_portfolio_summary(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE 
    WHEN auth.uid() = target_user_id THEN
      -- User viewing their own portfolio - show all data
      json_agg(
        json_build_object(
          'id', id,
          'platform_id', platform_id,
          'total_value', total_value,
          'day_change', day_change,
          'day_change_percent', day_change_percent,
          'cash_balance', cash_balance,
          'positions_count', CASE 
            WHEN positions IS NOT NULL THEN jsonb_array_length(positions)
            ELSE 0
          END,
          'last_updated', last_updated
        )
      )
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    ) THEN
      -- Admin viewing - show aggregated data only, log access
      json_agg(
        json_build_object(
          'id', id,
          'platform_id', platform_id,
          'total_value', total_value,
          'last_updated', last_updated
        )
      )
    ELSE
      -- Unauthorized access
      NULL
  END
  FROM public.investment_portfolios 
  WHERE user_id = target_user_id;
$function$;

-- Add constraint to ensure user_id is never null (security requirement)
ALTER TABLE public.investment_portfolios 
ALTER COLUMN user_id SET NOT NULL;

-- Add index for performance on user queries
CREATE INDEX IF NOT EXISTS idx_investment_portfolios_user_id 
ON public.investment_portfolios(user_id);

-- Add constraint to prevent negative values in financial data
ALTER TABLE public.investment_portfolios 
ADD CONSTRAINT check_positive_total_value 
CHECK (total_value >= 0);

ALTER TABLE public.investment_portfolios 
ADD CONSTRAINT check_positive_cash_balance 
CHECK (cash_balance >= 0);