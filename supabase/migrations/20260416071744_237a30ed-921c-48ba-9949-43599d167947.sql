
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/send-push-notification';
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288';
BEGIN
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', COALESCE(NEW.message, ''),
      'notification_type', NEW.notification_type,
      'link', NEW.link
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_push_on_insert error: %', SQLERRM;
  RETURN NEW;
END;
$$;
