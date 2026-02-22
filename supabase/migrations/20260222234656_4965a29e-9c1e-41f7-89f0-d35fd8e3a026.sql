
-- Course comments table with threading support
CREATE TABLE public.course_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.course_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Course comment likes table
CREATE TABLE public.course_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.course_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Indexes
CREATE INDEX idx_course_comments_course ON public.course_comments(course_id);
CREATE INDEX idx_course_comments_lesson ON public.course_comments(lesson_id);
CREATE INDEX idx_course_comments_parent ON public.course_comments(parent_id);
CREATE INDEX idx_course_comment_likes_comment ON public.course_comment_likes(comment_id);

-- RLS
ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_comment_likes ENABLE ROW LEVEL SECURITY;

-- Comments: anyone authenticated can read, users can insert/update/delete their own
CREATE POLICY "Anyone can read course comments" ON public.course_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.course_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.course_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.course_comments FOR DELETE USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Likes: anyone can read, users manage their own
CREATE POLICY "Anyone can read comment likes" ON public.course_comment_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.course_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.course_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_course_comments_updated_at BEFORE UPDATE ON public.course_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
