-- Create payment_reminders table for tracking overdue payments
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'overdue',
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Only admins can view payment reminders
CREATE POLICY "Admins can view payment reminders"
ON public.payment_reminders
FOR SELECT
USING (public.is_current_user_admin());

-- Only admins can manage payment reminders
CREATE POLICY "Admins can insert payment reminders"
ON public.payment_reminders
FOR INSERT
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update payment reminders"
ON public.payment_reminders
FOR UPDATE
USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete payment reminders"
ON public.payment_reminders
FOR DELETE
USING (public.is_current_user_admin());

-- Create index for faster queries
CREATE INDEX idx_payment_reminders_status ON public.payment_reminders(status);
CREATE INDEX idx_payment_reminders_days_overdue ON public.payment_reminders(days_overdue);

-- Trigger for updated_at
CREATE TRIGGER update_payment_reminders_updated_at
BEFORE UPDATE ON public.payment_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
