-- Create featured_courses table for course features management
CREATE TABLE public.featured_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  featured_by UUID NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  featured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unfeatured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(course_id)
);

-- Enable Row Level Security
ALTER TABLE public.featured_courses ENABLE ROW LEVEL SECURITY;

-- Create policies for featured courses
CREATE POLICY "Admins can manage featured courses" 
ON public.featured_courses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can view featured courses" 
ON public.featured_courses 
FOR SELECT 
USING (is_featured = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_featured_courses_updated_at
BEFORE UPDATE ON public.featured_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();