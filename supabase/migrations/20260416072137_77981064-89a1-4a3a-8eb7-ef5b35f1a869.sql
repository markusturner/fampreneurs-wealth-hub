
-- Remove duplicate function
DROP FUNCTION IF EXISTS public.notify_push_on_insert() CASCADE;

-- Ensure only one trigger exists
DROP TRIGGER IF EXISTS trigger_push_on_notification_insert ON public.notifications;
DROP TRIGGER IF EXISTS trigger_push_notification ON public.notifications;

-- Create the single trigger using existing function
CREATE TRIGGER trigger_push_on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();
