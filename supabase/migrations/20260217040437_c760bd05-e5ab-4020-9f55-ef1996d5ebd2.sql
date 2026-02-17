
-- Table for lesson resources (files, links)
CREATE TABLE public.course_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.course_videos(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'link', -- 'link', 'file', 'pdf'
  url TEXT,
  file_path TEXT,
  order_index INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course resources" ON public.course_resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage resources" ON public.course_resources FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update resources" ON public.course_resources FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete resources" ON public.course_resources FOR DELETE USING (auth.uid() IS NOT NULL);

-- Table for tracking lesson completions
CREATE TABLE public.lesson_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.lesson_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark lessons complete" ON public.lesson_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unmark lessons" ON public.lesson_completions FOR DELETE USING (auth.uid() = user_id);

-- Add content column to course_videos for rich lesson body
ALTER TABLE public.course_videos ADD COLUMN IF NOT EXISTS content TEXT;
