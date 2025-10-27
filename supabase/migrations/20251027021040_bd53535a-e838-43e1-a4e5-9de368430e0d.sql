-- Add admin access policy for subscribers table
-- This allows admins to view all subscription data for management purposes

CREATE POLICY "Admins can view all subscription data"
ON public.subscribers
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);
