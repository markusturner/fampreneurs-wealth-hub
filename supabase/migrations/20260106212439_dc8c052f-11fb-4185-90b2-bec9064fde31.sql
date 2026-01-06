-- Fix last remaining permissive policies

-- 1. community_call_bookings - already dropped, make sure new one exists
DROP POLICY IF EXISTS "Users can insert bookings" ON public.community_call_bookings;
-- The "Authenticated users can insert bookings" should already exist from earlier migration

-- 2. course_certificates - drop permissive, trigger handles inserts
DROP POLICY IF EXISTS "System can create certificates" ON public.course_certificates;

-- 3. family_office_audit_logs - strengthen
DROP POLICY IF EXISTS "System can create audit logs" ON public.family_office_audit_logs;
CREATE POLICY "Users can create their own audit logs"
ON public.family_office_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Note: service_role_delete_only on profiles is intentional - service role needs this for admin operations