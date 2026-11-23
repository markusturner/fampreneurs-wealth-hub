-- 1) Members can no longer change their own program, billing or access fields
CREATE OR REPLACE FUNCTION public.protect_profile_access_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server jobs (no signed-in user) and staff may change anything
  IF auth.uid() IS NULL OR public.is_current_user_staff() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.program_name := NULL;
    NEW.membership_type := 'free';
    NEW.software_only := false;
    NEW.truheirs_paid_until := NULL;
    NEW.subscription_paused := false;
    NEW.paused_at := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.program_contract_value := NULL;
    NEW.program_cash_collected := NULL;
    NEW.investment_amount := 0;
    NEW.backend_cash_collected := 0;
    NEW.admin_notes := NULL;
    NEW.admin_joined_date := NULL;
    NEW.contract_start_date := NULL;
    NEW.contract_due_date := NULL;
    NEW.contract_extension_date := NULL;
    NEW.skip_onboarding := false;
    NEW.partner_group_id := NULL;
    NEW.linked_user_ids := '{}'::uuid[];
    RETURN NEW;
  END IF;

  IF NEW.program_name IS DISTINCT FROM OLD.program_name
     OR NEW.membership_type IS DISTINCT FROM OLD.membership_type
     OR NEW.truheirs_access IS DISTINCT FROM OLD.truheirs_access
     OR NEW.software_only IS DISTINCT FROM OLD.software_only
     OR NEW.truheirs_paid_until IS DISTINCT FROM OLD.truheirs_paid_until
     OR NEW.subscription_paused IS DISTINCT FROM OLD.subscription_paused
     OR NEW.paused_at IS DISTINCT FROM OLD.paused_at
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.program_contract_value IS DISTINCT FROM OLD.program_contract_value
     OR NEW.program_cash_collected IS DISTINCT FROM OLD.program_cash_collected
     OR NEW.investment_amount IS DISTINCT FROM OLD.investment_amount
     OR NEW.backend_cash_collected IS DISTINCT FROM OLD.backend_cash_collected
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.admin_joined_date IS DISTINCT FROM OLD.admin_joined_date
     OR NEW.contract_extension_date IS DISTINCT FROM OLD.contract_extension_date
     OR NEW.skip_onboarding IS DISTINCT FROM OLD.skip_onboarding
     OR NEW.partner_group_id IS DISTINCT FROM OLD.partner_group_id
     OR NEW.linked_user_ids IS DISTINCT FROM OLD.linked_user_ids
     -- Onboarding may fill program dates once, but never change them afterwards
     OR (OLD.contract_start_date IS NOT NULL AND NEW.contract_start_date IS DISTINCT FROM OLD.contract_start_date)
     OR (OLD.contract_due_date IS NOT NULL AND NEW.contract_due_date IS DISTINCT FROM OLD.contract_due_date)
  THEN
    RAISE EXCEPTION 'Only staff can change program, billing or access details';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_access_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_access_fields_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_access_fields();

-- 2) One-time tokens that prove a request came from our own database jobs
CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  token text PRIMARY KEY,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_job_tokens TO service_role;
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: only the database itself and server functions can use this table.

CREATE OR REPLACE FUNCTION public.issue_job_token(p_purpose text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  DELETE FROM public.internal_job_tokens WHERE expires_at < now();
  v := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.internal_job_tokens(token, purpose) VALUES (v, p_purpose);
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_job_token(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_job_token(p_token text, p_purpose text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  DELETE FROM public.internal_job_tokens
   WHERE token = p_token AND purpose = p_purpose AND expires_at > now()
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_job_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_job_token(text, text) TO service_role;

-- 3) Database triggers now send a one-time token with each request
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'notification_type', NEW.notification_type,
        'reference_id', NEW.reference_id,
        'link', NEW.link
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288',
        'x-job-token', public.issue_job_token('send-push-notification')
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification dispatch skipped: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_community_post_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288',
          'x-job-token', public.issue_job_token('notify-community-post-email')
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288',
      'x-job-token', public.issue_job_token('community-manager-reply')
    ),
    body := jsonb_build_object('comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- 4) Scheduled jobs send a one-time token too
DO $do$
DECLARE
  anon constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288';
  base constant text := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/';
  jobs text[][] := ARRAY[
    ARRAY['process-payment-reminders-daily', '0 9 * * *', 'process-payment-reminders'],
    ARRAY['community-manager-daily-post', '0 14 * * *', 'community-manager-daily-post'],
    ARRAY['client-retention-autopilot-daily', '0 9 * * *', 'autopilot-send-retention'],
    ARRAY['send-weekly-survey-friday', '0 13 * * 5', 'send-weekly-survey'],
    ARRAY['pending-users-weekly-reminder', '0 15 * * 1', 'pending-users-daily-reminder'],
    ARRAY['payment-retry-reminders', '0 15 * * *', 'payment-retry-reminders'],
    ARRAY['family-report-quarterly', '0 16 1-7 1,4,7,10 *', 'family-report'],
    ARRAY['handoff-reminders-daily', '0 14 * * *', 'handoff-reminders']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(jobs, 1) LOOP
    PERFORM cron.schedule(
      jobs[i][1],
      jobs[i][2],
      format(
        $cmd$SELECT net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', %L, 'Authorization', %L, 'x-job-token', public.issue_job_token(%L)), body := jsonb_build_object('time', now()));$cmd$,
        base || jobs[i][3], anon, 'Bearer ' || anon, jobs[i][3]
      )
    );
  END LOOP;
END
$do$;