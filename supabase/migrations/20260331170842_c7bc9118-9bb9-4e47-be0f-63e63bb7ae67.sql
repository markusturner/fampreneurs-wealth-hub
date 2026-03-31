
CREATE OR REPLACE FUNCTION public.trigger_community_post_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger for top-level posts (not replies)
  IF NEW.parent_id IS NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/notify-community-post-email',
        body := jsonb_build_object(
          'post_id', NEW.id,
          'user_id', NEW.user_id,
          'content', NEW.content,
          'program', NEW.program,
          'category', NEW.category
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288'
        ),
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Community post email dispatch skipped: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_community_post_send_email
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_community_post_email();
