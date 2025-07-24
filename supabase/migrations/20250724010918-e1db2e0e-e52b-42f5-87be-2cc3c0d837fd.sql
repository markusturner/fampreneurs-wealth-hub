-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video')),
  content_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view active stories" 
ON public.stories 
FOR SELECT 
USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
ON public.stories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create story views table for tracking who viewed stories
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on story views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Story views policies
CREATE POLICY "Users can view story views for their own stories" 
ON public.story_views 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM stories 
  WHERE stories.id = story_views.story_id 
  AND stories.user_id = auth.uid()
));

CREATE POLICY "Users can create story views" 
ON public.story_views 
FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Create storage bucket for stories
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true);

-- Create storage policies for stories
CREATE POLICY "Anyone can view story content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own story content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own story content" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own story content" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);