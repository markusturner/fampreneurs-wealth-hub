-- Enable real-time updates for coaching_call_recordings table
ALTER TABLE public.coaching_call_recordings REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_call_recordings;