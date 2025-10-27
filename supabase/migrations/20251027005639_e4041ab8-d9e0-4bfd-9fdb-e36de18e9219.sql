-- Create table to track payment reminders sent
CREATE TABLE IF NOT EXISTS public.payment_reminders_sent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL,
  next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days', '3_days', '24_hours')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subscription_id, next_payment_date, reminder_type)
);

-- Add index for efficient querying
CREATE INDEX idx_payment_reminders_user_subscription ON public.payment_reminders_sent(user_id, subscription_id);
CREATE INDEX idx_payment_reminders_sent_at ON public.payment_reminders_sent(sent_at);

-- Enable RLS
ALTER TABLE public.payment_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own payment reminders"
  ON public.payment_reminders_sent
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all reminders
CREATE POLICY "Service role can manage payment reminders"
  ON public.payment_reminders_sent
  FOR ALL
  USING (true);