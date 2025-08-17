-- Fix security vulnerability in group_coaching_sessions table
-- Remove the overly permissive policy that allows everyone to view sessions
DROP POLICY IF EXISTS "Group coaching sessions are viewable by everyone" ON public.group_coaching_sessions;

-- Create secure policies that only allow access to enrolled participants and creators
CREATE POLICY "Session creators can view their own sessions" 
ON public.group_coaching_sessions 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Enrolled users can view sessions they are enrolled in" 
ON public.group_coaching_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.session_enrollments 
    WHERE session_enrollments.session_id = group_coaching_sessions.id 
    AND session_enrollments.user_id = auth.uid()
    AND session_enrollments.status = 'enrolled'
  )
);

CREATE POLICY "Admins can view all sessions" 
ON public.group_coaching_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);