-- Create table for group coaching sessions
CREATE TABLE public.group_coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  coach_name TEXT NOT NULL,
  coach_avatar_url TEXT,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_type TEXT NOT NULL DEFAULT 'zoom', -- 'zoom', 'google_meet', 'other'
  meeting_url TEXT NOT NULL,
  meeting_id TEXT,
  meeting_password TEXT,
  image_url TEXT,
  max_participants INTEGER DEFAULT 20,
  current_participants INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_end_date DATE,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'completed'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.group_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for group coaching sessions
CREATE POLICY "Group coaching sessions are viewable by everyone" 
ON public.group_coaching_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create group coaching sessions" 
ON public.group_coaching_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sessions" 
ON public.group_coaching_sessions 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own sessions" 
ON public.group_coaching_sessions 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create table for session enrollments
CREATE TABLE public.session_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.group_coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'enrolled', -- 'enrolled', 'attended', 'no_show'
  UNIQUE(session_id, user_id)
);

-- Enable RLS for enrollments
ALTER TABLE public.session_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for enrollments
CREATE POLICY "Users can view enrollments for sessions they can see" 
ON public.session_enrollments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can enroll in sessions" 
ON public.session_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" 
ON public.session_enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their enrollments" 
ON public.session_enrollments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_group_coaching_sessions_updated_at
BEFORE UPDATE ON public.group_coaching_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle enrollment count updates
CREATE OR REPLACE FUNCTION public.update_session_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.group_coaching_sessions 
    SET current_participants = current_participants + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.group_coaching_sessions 
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for participant count
CREATE TRIGGER update_participant_count_on_insert
AFTER INSERT ON public.session_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_session_participant_count();

CREATE TRIGGER update_participant_count_on_delete
AFTER DELETE ON public.session_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_session_participant_count();