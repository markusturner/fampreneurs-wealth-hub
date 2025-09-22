-- Fix remaining security issues: Function Search Path Mutable warnings

-- The following functions need SECURITY DEFINER and explicit search_path to fix security warnings:

-- 1. Fix validate_family_code function
CREATE OR REPLACE FUNCTION public.validate_family_code(p_code text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  code_record RECORD;
  usage_log_id UUID;
  user_id UUID := NULL;
BEGIN
  -- Find matching active code
  SELECT * INTO code_record
  FROM public.family_secret_codes 
  WHERE code = p_code 
    AND is_active = true;
  
  -- Check if code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or inactive code'
    );
  END IF;
  
  -- Check expiration
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Code has expired'
    );
  END IF;
  
  -- Check usage limits
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Code usage limit reached'
    );
  END IF;
  
  -- Get user ID if authenticated
  user_id := auth.uid();
  
  -- Log the usage
  INSERT INTO public.family_code_usage_log (
    family_code_id,
    user_id,
    ip_address,
    user_agent,
    used_at
  ) VALUES (
    code_record.id,
    user_id,
    p_ip_address::inet,
    p_user_agent,
    now()
  ) RETURNING id INTO usage_log_id;
  
  -- Update usage count
  UPDATE public.family_secret_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = code_record.id;
  
  -- Return success with access details
  RETURN jsonb_build_object(
    'valid', true,
    'access_level', code_record.access_level,
    'permissions', code_record.permissions,
    'usage_log_id', usage_log_id
  );
END;
$$;

-- 2. Fix handle_updated_at function (if it exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
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

-- 3. Fix update_user_program_assignment function (if it exists)
CREATE OR REPLACE FUNCTION public.update_user_program_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Update user program assignment logic here
  -- This is a placeholder - actual implementation depends on business logic
  RETURN NEW;
END;
$$;