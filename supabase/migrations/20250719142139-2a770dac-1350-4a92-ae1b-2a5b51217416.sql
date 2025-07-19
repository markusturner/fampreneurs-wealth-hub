-- Add modules table and update courses table for photo support
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add module_id to course_videos table
ALTER TABLE public.course_videos 
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL;

-- Add RLS policies for course_modules
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course modules are viewable by everyone" 
ON public.course_modules 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create modules for their courses" 
ON public.course_modules 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE courses.id = course_modules.course_id 
  AND courses.created_by = auth.uid()
));

CREATE POLICY "Users can update modules for their courses" 
ON public.course_modules 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE courses.id = course_modules.course_id 
  AND courses.created_by = auth.uid()
));

CREATE POLICY "Users can delete modules for their courses" 
ON public.course_modules 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE courses.id = course_modules.course_id 
  AND courses.created_by = auth.uid()
));

-- Add trigger for updating timestamps
CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();