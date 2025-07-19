-- Update the feedback notification function to check every 6 weeks instead of 2 weeks
CREATE OR REPLACE FUNCTION public.user_needs_feedback_notification(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT last_notification_sent < (now() - INTERVAL '6 weeks')
      FROM public.feedback_notifications 
      WHERE user_id = target_user_id
    ), 
    true -- If no record exists, user needs notification
  );
$$;