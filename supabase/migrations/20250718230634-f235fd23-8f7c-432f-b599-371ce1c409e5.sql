-- Create table for user course lists (My List feature)
CREATE TABLE public.user_course_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_course_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own course lists" 
ON public.user_course_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add courses to their list" 
ON public.user_course_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove courses from their list" 
ON public.user_course_lists 
FOR DELETE 
USING (auth.uid() = user_id);