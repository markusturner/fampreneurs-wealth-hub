-- Create security and audit tables for family office
-- This migration adds comprehensive security features for protecting family office information

-- Create audit log table for tracking all data access and modifications
CREATE TABLE IF NOT EXISTS public.family_office_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'download', 'login'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create security settings table
CREATE TABLE IF NOT EXISTS public.family_office_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  require_mfa BOOLEAN DEFAULT false,
  session_timeout_minutes INTEGER DEFAULT 120,
  allowed_ip_addresses TEXT[], -- Whitelist of IP addresses
  password_change_required_at TIMESTAMP WITH TIME ZONE,
  data_retention_days INTEGER DEFAULT 2555, -- 7 years
  encryption_enabled BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  last_security_review TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create data classification table for marking sensitive information
CREATE TABLE IF NOT EXISTS public.family_office_data_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  classification_level TEXT NOT NULL CHECK (classification_level IN ('public', 'internal', 'confidential', 'restricted')),
  masking_rule TEXT, -- 'partial', 'full', 'hash', 'encrypt'
  retention_period_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(table_name, column_name)
);

-- Create secure document storage tracking
CREATE TABLE IF NOT EXISTS public.family_office_secure_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  encrypted_filename TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  classification_level TEXT DEFAULT 'confidential' CHECK (classification_level IN ('public', 'internal', 'confidential', 'restricted')),
  encryption_key_id TEXT,
  checksum TEXT, -- For integrity verification
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create privacy preferences table
CREATE TABLE IF NOT EXISTS public.family_office_privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_sharing_consent BOOLEAN DEFAULT false,
  analytics_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  data_export_allowed BOOLEAN DEFAULT true,
  data_deletion_requested BOOLEAN DEFAULT false,
  data_deletion_requested_at TIMESTAMP WITH TIME ZONE,
  consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Add security columns to existing family_members table
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS data_classification TEXT DEFAULT 'confidential' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
ADD COLUMN IF NOT EXISTS encrypted_notes TEXT,
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.family_office_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.family_office_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.family_office_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON public.family_office_audit_logs(risk_level);

-- Enable RLS on all security tables
ALTER TABLE public.family_office_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_office_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_office_data_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_office_secure_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_office_privacy_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit logs (admin and user access)
CREATE POLICY "Users can view their own audit logs" 
ON public.family_office_audit_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

CREATE POLICY "System can create audit logs" 
ON public.family_office_audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create RLS policies for security settings
CREATE POLICY "Users can manage their own security settings" 
ON public.family_office_security_settings 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for data classification (admin only)
CREATE POLICY "Admins can manage data classification" 
ON public.family_office_data_classification 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Create RLS policies for secure documents
CREATE POLICY "Users can manage their own secure documents" 
ON public.family_office_secure_documents 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for privacy preferences
CREATE POLICY "Users can manage their own privacy preferences" 
ON public.family_office_privacy_preferences 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create security functions
CREATE OR REPLACE FUNCTION public.log_family_office_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_risk_level TEXT DEFAULT 'low',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.family_office_audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    risk_level,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_risk_level,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to mask sensitive data
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  p_data TEXT,
  p_masking_type TEXT DEFAULT 'partial'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_data IS NULL OR LENGTH(p_data) = 0 THEN
    RETURN p_data;
  END IF;
  
  CASE p_masking_type
    WHEN 'full' THEN
      RETURN '***MASKED***';
    WHEN 'partial' THEN
      IF LENGTH(p_data) <= 4 THEN
        RETURN '****';
      ELSE
        RETURN LEFT(p_data, 2) || REPEAT('*', LENGTH(p_data) - 4) || RIGHT(p_data, 2);
      END IF;
    WHEN 'email' THEN
      RETURN SPLIT_PART(p_data, '@', 1) || '@***';
    WHEN 'phone' THEN
      RETURN '***-***-' || RIGHT(p_data, 4);
    ELSE
      RETURN p_data;
  END CASE;
END;
$$;

-- Create function to check data access permissions
CREATE OR REPLACE FUNCTION public.can_access_family_data(
  p_record_id UUID,
  p_table_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
  has_permission BOOLEAN := false;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT is_admin INTO is_admin
  FROM public.profiles 
  WHERE user_id = current_user_id;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Check specific table permissions
  CASE p_table_name
    WHEN 'family_members' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE id = p_record_id 
        AND added_by = current_user_id
      ) INTO has_permission;
    ELSE
      -- Default to false for unknown tables
      has_permission := false;
  END CASE;
  
  RETURN has_permission;
END;
$$;

-- Insert default data classifications for sensitive family office data
INSERT INTO public.family_office_data_classification (table_name, column_name, classification_level, masking_rule) VALUES
('family_members', 'email', 'confidential', 'email'),
('family_members', 'phone', 'confidential', 'phone'),
('family_members', 'notes', 'restricted', 'partial'),
('family_members', 'trust_positions', 'confidential', 'partial'),
('family_documents', 'file_url', 'restricted', 'full'),
('connected_accounts', 'plaid_access_token', 'restricted', 'full'),
('connected_accounts', 'credentials', 'restricted', 'full'),
('family_member_credentials', 'password_hash', 'restricted', 'full'),
('account_transactions', 'amount', 'confidential', 'partial'),
('account_transactions', 'merchant_name', 'internal', 'none')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create trigger to automatically log family member changes
CREATE OR REPLACE FUNCTION public.audit_family_members_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_family_office_action(
      'create',
      'family_members',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      'medium',
      jsonb_build_object('trigger', 'automatic')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_family_office_action(
      'update',
      'family_members',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      'medium',
      jsonb_build_object('trigger', 'automatic')
    );
    
    -- Update access tracking
    NEW.last_accessed = now();
    NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_family_office_action(
      'delete',
      'family_members',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      'high',
      jsonb_build_object('trigger', 'automatic')
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_audit_family_members ON public.family_members;
CREATE TRIGGER trigger_audit_family_members
  BEFORE INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_family_members_changes();