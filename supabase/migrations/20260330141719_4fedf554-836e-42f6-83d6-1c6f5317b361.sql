
-- Add image_url column to community_groups
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for community photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-photos', 'community-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload community photos
CREATE POLICY "Authenticated users can upload community photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-photos');

-- Allow public read access to community photos
CREATE POLICY "Public read access for community photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'community-photos');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update community photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'community-photos');

CREATE POLICY "Authenticated users can delete community photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-photos');
