-- Create community tables for family-specific communication

-- Posts table for sharing content within families
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comments table for post discussions
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reactions table for likes and other reactions
CREATE TABLE public.community_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, reaction_type),
  UNIQUE(user_id, comment_id, reaction_type),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Posts (family-scoped based on user_id)
CREATE POLICY "Users can view posts from their family"
ON public.community_posts
FOR SELECT
USING (true); -- For now allow all authenticated users, can be refined based on family structure

CREATE POLICY "Users can create their own posts"
ON public.community_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.community_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.community_posts
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for Comments
CREATE POLICY "Users can view all comments"
ON public.community_comments
FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.community_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.community_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.community_comments
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for Reactions
CREATE POLICY "Users can view all reactions"
ON public.community_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can create reactions"
ON public.community_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.community_reactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.community_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updating timestamps
CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for community images
INSERT INTO storage.buckets (id, name, public) VALUES ('community-images', 'community-images', true);

-- Storage policies for community images
CREATE POLICY "Anyone can view community images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-images');

CREATE POLICY "Users can upload community images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own community images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own community images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);