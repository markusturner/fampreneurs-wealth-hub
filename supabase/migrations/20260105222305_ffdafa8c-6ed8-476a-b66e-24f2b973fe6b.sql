-- Create meeting_reminders table for scheduled notifications
CREATE TABLE IF NOT EXISTS public.meeting_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- '30_days', '7_days', '2_days', '24_hours', '12_hours', '2_hours', '5_minutes'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view meeting reminders
CREATE POLICY "Authenticated users can view meeting reminders" 
ON public.meeting_reminders 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to manage reminders (for edge functions)
CREATE POLICY "Service role can manage meeting reminders" 
ON public.meeting_reminders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add zoom_link and calendar_link columns to meetings table if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'zoom_link') THEN
    ALTER TABLE public.meetings ADD COLUMN zoom_link TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'calendar_link') THEN
    ALTER TABLE public.meetings ADD COLUMN calendar_link TEXT;
  END IF;
END $$;

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_meeting_reminders_scheduled ON public.meeting_reminders(scheduled_for, sent);
CREATE INDEX IF NOT EXISTS idx_meeting_reminders_meeting ON public.meeting_reminders(meeting_id);