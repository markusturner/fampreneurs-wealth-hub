-- Add subscription_period field to track billing frequency
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS subscription_period TEXT DEFAULT 'monthly';

-- Add a comment to describe the column
COMMENT ON COLUMN public.subscribers.subscription_period IS 'Billing period: monthly, quarterly, or annual';
