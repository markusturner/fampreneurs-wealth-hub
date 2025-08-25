-- Fix only the most critical functions causing linter errors
-- Take a targeted approach to avoid parameter default issues

-- 1. Fix audit_investment_portfolio_access
CREATE OR REPLACE FUNCTION public.audit_investment_portfolio_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- 2. Fix auto_assign_to_community_group 
CREATE OR REPLACE FUNCTION public.auto_assign_to_community_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    group_id uuid;
BEGIN
    -- Map program names to community group names and find existing group
    IF NEW.program_name IS NOT NULL THEN
        SELECT id INTO group_id 
        FROM community_groups 
        WHERE name = CASE 
            WHEN NEW.program_name = 'The Family Business University' THEN 'FBU'
            WHEN NEW.program_name = 'The Family Vault' THEN 'TFBV'  
            WHEN NEW.program_name = 'The Family Business Accelerator' THEN 'TFBA'
            WHEN NEW.program_name = 'The Family Legacy: VIP Weekend' THEN 'TFLVIP'
            WHEN NEW.program_name = 'The Family Fortune Mastermind' THEN 'TFFM'
            ELSE NEW.program_name
        END
        LIMIT 1;
        
        -- If group exists, add user to it
        IF group_id IS NOT NULL THEN
            INSERT INTO group_memberships (group_id, user_id, role)
            VALUES (group_id, NEW.user_id, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;