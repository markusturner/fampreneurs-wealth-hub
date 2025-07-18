-- Add missing columns to community_posts table
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES community_posts(id) ON DELETE CASCADE;

-- Create community-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create community-audio storage bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-audio', 'community-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Users can view announcements" ON announcements 
FOR SELECT USING (true);

CREATE POLICY "Admins can create announcements" ON announcements 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update announcements" ON announcements 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can delete announcements" ON announcements 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Storage policies for community-images bucket
CREATE POLICY "Users can upload images to community-images" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view community images" ON storage.objects
FOR SELECT 
USING (bucket_id = 'community-images');

CREATE POLICY "Users can update their own community images" ON storage.objects
FOR UPDATE 
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own community images" ON storage.objects
FOR DELETE 
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for community-audio bucket
CREATE POLICY "Users can upload audio to community-audio" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'community-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view community audio" ON storage.objects
FOR SELECT 
USING (bucket_id = 'community-audio');

CREATE POLICY "Users can update their own community audio" ON storage.objects
FOR UPDATE 
USING (bucket_id = 'community-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own community audio" ON storage.objects
FOR DELETE 
USING (bucket_id = 'community-audio' AND auth.uid()::text = (storage.foldername(name))[1]);