-- Create attendance tracking system for group and individual calls

-- Create session_attendance table to track member attendance
CREATE TABLE public.session_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('group', 'individual')),
  attended BOOLEAN NOT NULL DEFAULT false,
  attendance_duration_minutes INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id, session_type)
);

-- Enable RLS
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for session_attendance
CREATE POLICY "Users can view their own attendance" ON public.session_attendance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attendance" ON public.session_attendance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON public.session_attendance
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attendance" ON public.session_attendance
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Create function to calculate member scores including attendance
CREATE OR REPLACE FUNCTION public.calculate_member_score(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  course_score INTEGER := 0;
  attendance_score INTEGER := 0;
  total_score INTEGER := 0;
BEGIN
  -- Calculate course progress score (0-40 points)
  SELECT COALESCE(AVG(progress), 0) * 0.4 INTO course_score
  FROM public.course_enrollments
  WHERE user_id = target_user_id;

  -- Calculate attendance score (0-60 points)
  -- Group calls: 5 points each, Individual calls: 10 points each
  SELECT COALESCE(
    (SELECT COUNT(*) * 5 FROM public.session_attendance 
     WHERE user_id = target_user_id 
     AND session_type = 'group' 
     AND attended = true) +
    (SELECT COUNT(*) * 10 FROM public.session_attendance 
     WHERE user_id = target_user_id 
     AND session_type = 'individual' 
     AND attended = true), 0
  ) INTO attendance_score;

  -- Cap attendance score at 60
  attendance_score := LEAST(attendance_score, 60);

  total_score := course_score + attendance_score;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update attendance timestamps
CREATE OR REPLACE FUNCTION public.update_attendance_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_attendance_timestamps
BEFORE UPDATE ON public.session_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_attendance_timestamps();