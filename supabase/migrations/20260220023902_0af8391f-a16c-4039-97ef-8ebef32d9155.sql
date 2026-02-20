
-- Create user payment plans table for admin-invited users
CREATE TABLE IF NOT EXISTS public.user_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'payment_plan', -- 'paid_in_full' or 'payment_plan'
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  installment_amount NUMERIC,
  installment_frequency TEXT DEFAULT 'monthly', -- 'monthly', 'weekly', 'biweekly'
  next_payment_due DATE,
  payment_start_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'overdue', 'paid', 'revoked'
  missed_payments INTEGER NOT NULL DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payment_plans ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all payment plans
CREATE POLICY "Admins can manage all payment plans"
  ON public.user_payment_plans
  FOR ALL
  USING (public.is_current_user_admin() OR public.is_current_user_owner());

-- Users can view their own payment plan
CREATE POLICY "Users can view own payment plan"
  ON public.user_payment_plans
  FOR SELECT
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_user_payment_plans_updated_at
  BEFORE UPDATE ON public.user_payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
