-- Create coaching_call_recordings table
CREATE TABLE public.coaching_call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  recording_url TEXT NOT NULL,
  recording_type TEXT NOT NULL DEFAULT 'url' CHECK (recording_type IN ('upload', 'url')),
  platform TEXT,
  duration_minutes INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  category TEXT
);

-- Enable Row Level Security
ALTER TABLE public.coaching_call_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage coaching recordings"
ON public.coaching_call_recordings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.is_admin = true
));

CREATE POLICY "Users can view coaching recordings"
ON public.coaching_call_recordings
FOR SELECT
USING (true);

-- Create storage bucket for coaching recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('coaching-recordings', 'coaching-recordings', true);

-- Create storage policies
CREATE POLICY "Admins can upload coaching recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'coaching-recordings' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Coaching recordings are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'coaching-recordings');

-- Create trigger for updated_at
CREATE TRIGGER update_coaching_recordings_updated_at
BEFORE UPDATE ON public.coaching_call_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();