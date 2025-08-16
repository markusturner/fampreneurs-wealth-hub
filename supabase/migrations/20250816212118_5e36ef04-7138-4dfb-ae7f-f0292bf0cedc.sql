-- Create meetings table for scribe notes functionality
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_type TEXT,
  created_by UUID NOT NULL,
  scribe_notes TEXT,
  scribe_id UUID,
  status TEXT NOT NULL DEFAULT 'scheduled',
  location TEXT,
  attendees TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Create policies for meetings
CREATE POLICY "Users can manage their own meetings"
ON public.meetings
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create policy for scribes to add notes to any meeting
CREATE POLICY "Scribes can add notes to meetings"
ON public.meetings
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();