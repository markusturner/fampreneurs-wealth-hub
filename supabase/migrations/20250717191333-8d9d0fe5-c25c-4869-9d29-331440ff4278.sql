-- Create subscribers table to track subscription information
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscription info
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Create policy for edge functions to update subscription info
CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

-- Create policy for edge functions to insert subscription info
CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Add is_premium field to community_groups table
ALTER TABLE public.community_groups 
ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;

-- Update group membership policies to check subscription for premium groups
DROP POLICY IF EXISTS "Users can join groups they have permission for" ON public.group_memberships;

-- Create function to check if user has premium subscription
CREATE OR REPLACE FUNCTION public.user_has_premium_subscription(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE subscribers.user_id = $1 
    AND subscribers.subscribed = true
    AND (subscribers.subscription_end IS NULL OR subscribers.subscription_end > now())
  );
$$;

-- New policy for group memberships that includes premium check
CREATE POLICY "Users can join groups they have permission for" ON public.group_memberships
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) AND 
  can_join_group(group_id, auth.uid()) AND
  (
    NOT EXISTS (
      SELECT 1 FROM public.community_groups 
      WHERE community_groups.id = group_id AND community_groups.is_premium = true
    ) 
    OR public.user_has_premium_subscription(auth.uid())
  )
);

-- Update group viewing policies to show premium groups but restrict access
DROP POLICY IF EXISTS "Users can view private groups they belong to" ON public.community_groups;
DROP POLICY IF EXISTS "Users can view public groups" ON public.community_groups;

-- Allow viewing all groups (premium status will be handled in UI)
CREATE POLICY "Users can view all groups" ON public.community_groups
FOR SELECT
USING (
  NOT is_private OR 
  EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_memberships.group_id = community_groups.id 
    AND group_memberships.user_id = auth.uid()
  )
);

-- Update trigger for subscribers table
CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();