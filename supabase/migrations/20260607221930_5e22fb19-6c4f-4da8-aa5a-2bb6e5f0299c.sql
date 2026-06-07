
CREATE TABLE IF NOT EXISTS public.community_manager_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  persona_user_id uuid NOT NULL DEFAULT 'be40b593-93de-4edc-baae-99d8b1c6757e'::uuid,
  reply_enabled boolean NOT NULL DEFAULT true,
  post_hour_utc smallint NOT NULL DEFAULT 14,
  last_post_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_manager_settings TO authenticated;
GRANT ALL ON public.community_manager_settings TO service_role;
ALTER TABLE public.community_manager_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read community manager settings" ON public.community_manager_settings;
CREATE POLICY "Admins read community manager settings" ON public.community_manager_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.community_manager_settings (enabled)
  SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.community_manager_settings);

CREATE TABLE IF NOT EXISTS public.community_manager_post_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid,
  program text NOT NULL,
  template_key text NOT NULL,
  title text,
  posted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_manager_post_log_posted_idx ON public.community_manager_post_log (posted_at DESC);
GRANT SELECT ON public.community_manager_post_log TO authenticated;
GRANT ALL ON public.community_manager_post_log TO service_role;
ALTER TABLE public.community_manager_post_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read post log" ON public.community_manager_post_log;
CREATE POLICY "Admins read post log" ON public.community_manager_post_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.community_manager_reply_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_post_id uuid,
  reply_post_id uuid,
  replied_to_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_manager_reply_log_created_idx ON public.community_manager_reply_log (created_at DESC);
GRANT SELECT ON public.community_manager_reply_log TO authenticated;
GRANT ALL ON public.community_manager_reply_log TO service_role;
ALTER TABLE public.community_manager_reply_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read reply log" ON public.community_manager_reply_log;
CREATE POLICY "Admins read reply log" ON public.community_manager_reply_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pending_user_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);
CREATE INDEX IF NOT EXISTS pending_reminder_user_idx ON public.pending_user_reminder_log (user_id, sent_at DESC);
GRANT SELECT ON public.pending_user_reminder_log TO authenticated;
GRANT ALL ON public.pending_user_reminder_log TO service_role;
ALTER TABLE public.pending_user_reminder_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read reminder log" ON public.pending_user_reminder_log;
CREATE POLICY "Admins read reminder log" ON public.pending_user_reminder_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.trigger_community_manager_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_row public.community_manager_settings%ROWTYPE;
  parent_user uuid;
BEGIN
  SELECT * INTO settings_row FROM public.community_manager_settings LIMIT 1;
  IF settings_row.reply_enabled IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.user_id = settings_row.persona_user_id THEN RETURN NEW; END IF;
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO parent_user FROM public.community_posts WHERE id = NEW.parent_id;
  IF parent_user IS DISTINCT FROM settings_row.persona_user_id THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/community-manager-reply',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288"}'::jsonb,
    body := jsonb_build_object('comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_manager_reply_trigger ON public.community_posts;
CREATE TRIGGER community_manager_reply_trigger
  AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_community_manager_reply();
