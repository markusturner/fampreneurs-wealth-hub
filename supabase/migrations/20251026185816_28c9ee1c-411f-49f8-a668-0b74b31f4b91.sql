-- Create function to get overdue payments for admin dashboard
CREATE OR REPLACE FUNCTION public.get_overdue_payments()
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  amount NUMERIC,
  days_overdue INTEGER,
  last_reminder_sent TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    id,
    user_email,
    amount,
    days_overdue,
    last_reminder_sent
  FROM public.payment_reminders
  WHERE status = 'overdue'
    AND public.is_current_user_admin()
  ORDER BY days_overdue DESC;
$$;
