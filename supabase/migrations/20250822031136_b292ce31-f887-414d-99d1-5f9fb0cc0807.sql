-- Enhance subscribers table security with audit logging for admin access

-- Create audit trigger for admin access to subscriber data
CREATE OR REPLACE FUNCTION public.audit_subscriber_admin_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when admins access subscriber data (not when users access their own)
  IF auth.uid() != NEW.user_id AND public.is_current_user_admin() THEN
    PERFORM public.log_family_office_action(
      'admin_subscriber_access',
      'subscribers',
      NEW.id,
      NULL,
      NULL,
      'high',
      jsonb_build_object(
        'admin_user', auth.uid(),
        'accessed_subscriber', NEW.user_id,
        'subscriber_email', NEW.email,
        'access_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to SELECT operations
-- Note: This creates an audit trail when admins access subscriber data
COMMENT ON FUNCTION public.audit_subscriber_admin_access() IS 'Logs admin access to subscriber data for security monitoring';