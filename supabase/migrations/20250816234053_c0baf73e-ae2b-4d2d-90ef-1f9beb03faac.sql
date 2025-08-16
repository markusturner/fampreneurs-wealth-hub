-- Create meeting_types table for managing different types of meetings
CREATE TABLE public.meeting_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting types
CREATE POLICY "Users can view active meeting types" 
ON public.meeting_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage meeting types" 
ON public.meeting_types 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_meeting_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_meeting_types_updated_at
  BEFORE UPDATE ON public.meeting_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_types_updated_at();

-- Insert default meeting types
INSERT INTO public.meeting_types (name, color, description, created_by) VALUES
  ('Live Trading', '#3b82f6', 'Real-time trading sessions and market analysis', '00000000-0000-0000-0000-000000000000'),
  ('Q&A Session', '#8b5cf6', 'Question and answer sessions with experts', '00000000-0000-0000-0000-000000000000'),
  ('YouTube Live', '#ef4444', 'Live streaming sessions on YouTube', '00000000-0000-0000-0000-000000000000'),
  ('Family Function', '#22c55e', 'Family gatherings and social events', '00000000-0000-0000-0000-000000000000'),
  ('Trust Coaching', '#f97316', 'Trust management and coaching sessions', '00000000-0000-0000-0000-000000000000'),
  ('Board Meeting', '#6366f1', 'Formal board meetings and governance', '00000000-0000-0000-0000-000000000000'),
  ('Investment Review', '#eab308', 'Portfolio reviews and investment discussions', '00000000-0000-0000-0000-000000000000'),
  ('Estate Planning', '#ec4899', 'Estate planning and wealth transfer sessions', '00000000-0000-0000-0000-000000000000'),
  ('Other', '#6b7280', 'General meetings and miscellaneous events', '00000000-0000-0000-0000-000000000000');