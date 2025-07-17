-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to send feedback notifications every 2 weeks
-- This runs at 10:00 AM every other Monday (0 10 * * 1/2)
SELECT cron.schedule(
  'feedback-notifications-biweekly',
  '0 10 * * 1/2', -- At 10:00 AM on every 2nd Monday (every 2 weeks)
  $$
  SELECT
    net.http_post(
        url:='https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/feedback-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);