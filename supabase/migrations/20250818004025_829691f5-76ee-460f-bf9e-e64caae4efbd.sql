-- Create family secret codes table
CREATE TABLE public.family_secret_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'basic', -- basic, trust, legacy, admin
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  max_uses INTEGER NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family code usage log table
CREATE TABLE public.family_code_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.family_secret_codes(id) ON DELETE CASCADE,
  used_by UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT NULL,
  user_agent TEXT NULL
);

-- Enable RLS
ALTER TABLE public.family_secret_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_code_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_secret_codes
CREATE POLICY "Family admins can manage codes" 
ON public.family_secret_codes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Users can view active codes they created"
ON public.family_secret_codes
FOR SELECT
USING (created_by = auth.uid() AND is_active = true);

-- RLS policies for family_code_usage_log
CREATE POLICY "Admins can view all usage logs"
ON public.family_code_usage_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Users can view their own usage"
ON public.family_code_usage_log
FOR SELECT
USING (used_by = auth.uid());

-- Create function to validate and use family code
CREATE OR REPLACE FUNCTION public.validate_family_code(
  p_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code_record RECORD;
  v_result JSONB;
BEGIN
  -- Find the code
  SELECT * INTO v_code_record
  FROM public.family_secret_codes
  WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid access code'
    );
  END IF;
  
  -- Check if expired
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access code has expired'
    );
  END IF;
  
  -- Check usage limit
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access code usage limit reached'
    );
  END IF;
  
  -- Log the usage
  INSERT INTO public.family_code_usage_log (
    code_id,
    used_by,
    ip_address,
    user_agent
  ) VALUES (
    v_code_record.id,
    auth.uid(),
    p_ip_address,
    p_user_agent
  );
  
  -- Update usage count
  UPDATE public.family_secret_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = v_code_record.id;
  
  -- Return success with access level and permissions
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Access granted',
    'access_level', v_code_record.access_level,
    'permissions', v_code_record.permissions,
    'description', v_code_record.description
  );
END;
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_family_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_codes_updated_at
  BEFORE UPDATE ON public.family_secret_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_family_codes_updated_at();