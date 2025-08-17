-- Tighten security on subscribers table RLS policies

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_can_insert_subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_can_delete_subscriptions" ON public.subscribers;

-- Create secure SELECT policy - users can only see their own subscription data
CREATE POLICY "users_can_view_own_subscription_only" ON public.subscribers
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create secure INSERT policy - restrict to service role only for edge functions
CREATE POLICY "service_role_insert_only" ON public.subscribers
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Create secure UPDATE policy - users can only update their own records
CREATE POLICY "users_can_update_own_subscription_only" ON public.subscribers
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create secure DELETE policy - restrict to service role only
CREATE POLICY "service_role_delete_only" ON public.subscribers
FOR DELETE 
TO service_role
USING (true);

-- Add admin SELECT policy for administrative access
CREATE POLICY "admins_can_view_all_subscriptions" ON public.subscribers
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Add admin UPDATE policy for administrative operations
CREATE POLICY "admins_can_update_all_subscriptions" ON public.subscribers
FOR UPDATE 
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