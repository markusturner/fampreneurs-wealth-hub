-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Create channel_members table
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS on channel_members
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Create policies for channels (after channel_members table exists)
CREATE POLICY "Users can view public channels" 
ON public.channels 
FOR SELECT 
USING (NOT is_private OR EXISTS (
  SELECT 1 FROM channel_members 
  WHERE channel_id = channels.id AND user_id = auth.uid()
));

CREATE POLICY "Users can create channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel creators can update their channels" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Channel creators can delete their channels" 
ON public.channels 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create policies for channel_members
CREATE POLICY "Channel members can view memberships" 
ON public.channel_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM channel_members cm 
  WHERE cm.channel_id = channel_members.channel_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Users can join public channels" 
ON public.channel_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM channels WHERE id = channel_id AND NOT is_private)
);

CREATE POLICY "Users can leave channels" 
ON public.channel_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add channel_id to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Add video_url to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN video_url TEXT;

-- Create community_comment_reactions table
CREATE TABLE public.community_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS on comment reactions
ALTER TABLE public.community_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for comment reactions
CREATE POLICY "Users can view comment reactions" 
ON public.community_comment_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create comment reactions" 
ON public.community_comment_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment reactions" 
ON public.community_comment_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();