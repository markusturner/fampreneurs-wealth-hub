-- Create video comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parent_id UUID NULL -- For replies to comments
);

-- Create video likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id) -- Prevent duplicate likes
);

-- Create saved videos table
CREATE TABLE public.saved_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id) -- Prevent duplicate saves
);

-- Enable RLS on all tables
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_comments
CREATE POLICY "Users can view all video comments" 
ON public.video_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own comments" 
ON public.video_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.video_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.video_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for video_likes
CREATE POLICY "Users can view all video likes" 
ON public.video_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own likes" 
ON public.video_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.video_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for saved_videos
CREATE POLICY "Users can view their own saved videos" 
ON public.saved_videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save videos" 
ON public.saved_videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave videos" 
ON public.saved_videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger for video_comments
CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();