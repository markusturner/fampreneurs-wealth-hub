-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule payment reminder job to run daily at 9 AM UTC
SELECT cron.schedule(
  'process-payment-reminders-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/process-payment-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);