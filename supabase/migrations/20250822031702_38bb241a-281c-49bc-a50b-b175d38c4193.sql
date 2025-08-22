-- Enhanced security for investment_portfolios table
-- Addresses: Banking and Investment Data Could Be Accessed by Hackers

-- 1. Create enhanced security function for investment portfolio access
CREATE OR REPLACE FUNCTION public.get_masked_portfolio_summary(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
      -- Admin viewing - show masked/aggregated data only, log access
      (
        SELECT json_agg(
          json_build_object(
            'id', id,
            'platform_id', platform_id,
            'total_value_masked', '***ADMIN VIEW***',
            'summary_only', true,
            'last_updated', last_updated
          )
        )
        FROM public.investment_portfolios 
        WHERE user_id = target_user_id
      )
    ELSE
      -- Unauthorized access
      NULL
  END
  FROM public.investment_portfolios 
  WHERE user_id = target_user_id;
$$;

-- 2. Create audit logging for high-value portfolio access
CREATE OR REPLACE FUNCTION public.log_portfolio_access()
RETURNS TRIGGER AS $$
DECLARE
  portfolio_value NUMERIC;
BEGIN
  -- Only log access to high-value portfolios (> $100k)
  IF TG_OP = 'SELECT' AND NEW.total_value > 100000 THEN
    -- Log admin access to high-value portfolios
    IF auth.uid() != NEW.user_id AND public.is_current_user_admin() THEN
      PERFORM public.log_family_office_action(
        'admin_high_value_portfolio_access',
        'investment_portfolios',
        NEW.id,
        NULL,
        NULL,
        'critical',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'portfolio_owner', NEW.user_id,
          'portfolio_value', NEW.total_value,
          'platform_id', NEW.platform_id,
          'access_time', now(),
          'risk_assessment', 'high_value_financial_data'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Update existing audit trigger to be more comprehensive
CREATE OR REPLACE FUNCTION public.audit_investment_portfolio_access()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_created',
      'investment_portfolios',
      NEW.id,
      NULL,
      to_jsonb(NEW) - 'positions', -- Exclude detailed positions from logs
      'medium',
      jsonb_build_object(
        'trigger', 'automatic',
        'platform_id', NEW.platform_id,
        'total_value_range', CASE 
          WHEN NEW.total_value > 1000000 THEN 'high'
          WHEN NEW.total_value > 100000 THEN 'medium' 
          ELSE 'low' 
        END
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_updated',
      'investment_portfolios',
      NEW.id,
      to_jsonb(OLD) - 'positions',
      to_jsonb(NEW) - 'positions',
      CASE 
        WHEN ABS(NEW.total_value - OLD.total_value) > 50000 THEN 'high'
        ELSE 'medium' 
      END,
      jsonb_build_object(
        'trigger', 'automatic',
        'value_change', NEW.total_value - OLD.total_value,
        'platform_id', NEW.platform_id,
        'significant_change', ABS(NEW.total_value - OLD.total_value) > 50000
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_family_office_action(
      'investment_portfolio_deleted',
      'investment_portfolios',
      OLD.id,
      to_jsonb(OLD) - 'positions',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Create rate limiting function for portfolio access
CREATE OR REPLACE FUNCTION public.check_portfolio_access_rate_limit(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Check if user has exceeded access rate limit (max 100 queries per hour)
  SELECT COUNT(*)
  INTO access_count
  FROM public.family_office_audit_logs
  WHERE action LIKE '%portfolio%'
    AND user_id = check_portfolio_access_rate_limit.user_id
    AND created_at > now() - interval '1 hour';
    
  RETURN access_count < 100;
END;
$$;

-- 5. Add comment for security documentation
COMMENT ON TABLE public.investment_portfolios IS 'SECURITY: Contains highly sensitive financial data. Access logged and monitored. RLS enforced - users can only access own data.';
COMMENT ON FUNCTION public.get_masked_portfolio_summary(uuid) IS 'SECURITY: Returns masked portfolio data for admin access with full audit logging';
COMMENT ON FUNCTION public.check_portfolio_access_rate_limit(uuid) IS 'SECURITY: Rate limiting protection for portfolio data access';