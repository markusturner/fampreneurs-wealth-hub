-- Create storage bucket for cover photos
INSERT INTO storage.buckets (id, name, public) VALUES ('cover-photos', 'cover-photos', true);

-- Create policies for cover photo uploads
CREATE POLICY "Cover photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cover-photos');

CREATE POLICY "Users can upload their own cover photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own cover photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cover photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add cover_photo_url column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;