-- CRITICAL SECURITY FIX: Secure private coaching session recordings
-- Remove public access to sensitive coaching content

-- 1. Remove the dangerous public SELECT policy
DROP POLICY IF EXISTS "Users can view coaching recordings" ON public.coaching_call_recordings;
DROP POLICY IF EXISTS "Admins can manage coaching recordings" ON public.coaching_call_recordings;

-- 2. Create secure policies for coaching_call_recordings
-- Only authenticated users with proper authorization can access recordings

-- Admins can manage all recordings (authenticated only)
CREATE POLICY "Admins can manage all coaching recordings"
ON public.coaching_call_recordings
FOR ALL
TO authenticated
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

-- Recording creators can manage their own recordings
CREATE POLICY "Creators can manage own recordings"
ON public.coaching_call_recordings
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Premium subscribers can view recordings (but not modify)
CREATE POLICY "Premium subscribers can view recordings"
ON public.coaching_call_recordings
FOR SELECT
TO authenticated
USING (
  -- Check if user has premium subscription
  EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = auth.uid() 
    AND subscribed = true
    AND (subscription_end IS NULL OR subscription_end > now())
  )
  OR
  -- Or if user is admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  -- Or if user created the recording
  auth.uid() = created_by
);

-- 3. Remove any anonymous table privileges
REVOKE ALL ON TABLE public.coaching_call_recordings FROM anon, public;

-- 4. Grant minimal necessary privileges to authenticated users only
GRANT SELECT ON TABLE public.coaching_call_recordings TO authenticated;

-- 5. Ensure only authorized roles can modify recordings
-- (Admins and creators already handled in policies above)

-- 6. Add audit logging for recording access
CREATE OR REPLACE FUNCTION public.log_coaching_recording_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Log access to coaching recordings for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.family_office_audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      metadata,
      risk_level
    ) VALUES (
      auth.uid(),
      'coaching_recording_accessed',
      'coaching_call_recordings',
      NEW.id,
      jsonb_build_object(
        'recording_title', NEW.title,
        'access_time', now(),
        'user_id', auth.uid()
      ),
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Triggers on SELECT are not supported in PostgreSQL
-- Instead, we'll rely on application-level logging for recording access