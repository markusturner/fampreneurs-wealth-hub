-- Create verification codes table for temporary storage of 2FA codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone_number TEXT,
  code TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('sms', 'email')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user 2FA settings table
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  method TEXT NOT NULL CHECK (method IN ('phone', 'email', 'authenticator')),
  phone_number TEXT,
  secret TEXT, -- For TOTP/authenticator apps
  enabled BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification_codes (system only)
CREATE POLICY "System can manage verification codes" 
ON public.verification_codes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS policies for user_2fa_settings
CREATE POLICY "Users can view their own 2FA settings" 
ON public.user_2fa_settings 
FOR SELECT 
USING (email = auth.email());

CREATE POLICY "Users can update their own 2FA settings" 
ON public.user_2fa_settings 
FOR ALL 
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_2fa_settings_updated_at
BEFORE UPDATE ON public.user_2fa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup expired verification codes function
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;