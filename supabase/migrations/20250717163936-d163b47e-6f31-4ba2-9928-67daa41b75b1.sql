-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT,
  duration TEXT,
  level TEXT DEFAULT 'Beginner',
  price TEXT DEFAULT 'Free',
  image_url TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course videos table
CREATE TABLE public.course_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- For uploaded videos or external URLs
  video_type TEXT NOT NULL CHECK (video_type IN ('upload', 'youtube', 'vimeo', 'loom')),
  duration_seconds INTEGER,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Courses are viewable by everyone" 
ON public.courses 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create courses" 
ON public.courses 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own courses" 
ON public.courses 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own courses" 
ON public.courses 
FOR DELETE 
USING (auth.uid() = created_by);

-- RLS Policies for course videos
CREATE POLICY "Course videos are viewable by everyone" 
ON public.course_videos 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create videos for their courses" 
ON public.course_videos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can update videos for their courses" 
ON public.course_videos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete videos for their courses" 
ON public.course_videos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND created_by = auth.uid()
  )
);

-- RLS Policies for course enrollments
CREATE POLICY "Users can view their own enrollments" 
ON public.course_enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" 
ON public.course_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollment progress" 
ON public.course_enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public) VALUES ('course-videos', 'course-videos', true);

-- Storage policies for course videos
CREATE POLICY "Course videos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-videos');

CREATE POLICY "Users can upload course videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'course-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own course videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'course-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own course videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'course-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create triggers for updated_at
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_videos_updated_at
  BEFORE UPDATE ON public.course_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();