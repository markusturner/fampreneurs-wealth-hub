-- Create tutorial_videos table for managing multiple tutorial videos
CREATE TABLE public.tutorial_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration TEXT DEFAULT '5 min',
  category TEXT NOT NULL DEFAULT 'Getting Started',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

-- Everyone can view active tutorial videos
CREATE POLICY "Anyone can view active tutorial videos"
ON public.tutorial_videos
FOR SELECT
USING (is_active = true);

-- Admins and owners can manage tutorial videos
CREATE POLICY "Admins can insert tutorial videos"
ON public.tutorial_videos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Admins can update tutorial videos"
ON public.tutorial_videos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Admins can delete tutorial videos"
ON public.tutorial_videos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_tutorial_videos_updated_at
BEFORE UPDATE ON public.tutorial_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();