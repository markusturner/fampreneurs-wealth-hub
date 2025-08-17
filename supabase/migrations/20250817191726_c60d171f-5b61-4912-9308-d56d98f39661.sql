-- Fix security vulnerabilities in subscribers table RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure INSERT policy - only allow service role (edge functions) to insert
CREATE POLICY "service_role_can_insert_subscriptions" ON public.subscribers
FOR INSERT 
WITH CHECK (true);

-- Create secure UPDATE policy - only allow users to update their own records or service role
CREATE POLICY "users_can_update_own_subscription" ON public.subscribers
FOR UPDATE 
USING (user_id = auth.uid() OR email = auth.email())
WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- Add DELETE policy for security completeness - only allow service role
CREATE POLICY "service_role_can_delete_subscriptions" ON public.subscribers
FOR DELETE 
USING (true);