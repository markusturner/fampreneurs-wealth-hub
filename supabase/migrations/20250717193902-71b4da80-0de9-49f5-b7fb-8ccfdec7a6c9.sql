-- Create cron job to send feedback notifications every 2 weeks
-- This runs at 10:00 AM on the 1st and 15th of every month (approximately every 2 weeks)
SELECT cron.schedule(
  'feedback-notifications-biweekly',
  '0 10 1,15 * *', -- At 10:00 AM on the 1st and 15th day of every month
  $$
  SELECT
    net.http_post(
        url:='https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/feedback-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);