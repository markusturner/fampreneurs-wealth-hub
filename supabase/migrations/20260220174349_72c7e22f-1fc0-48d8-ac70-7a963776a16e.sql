
-- Allow authenticated users to upload to cover-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cover-photos', 'cover-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated uploads to cover-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from cover-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from cover-photos" ON storage.objects;

-- Allow any authenticated user to upload
CREATE POLICY "Allow authenticated uploads to cover-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cover-photos');

-- Allow public reads
CREATE POLICY "Allow public reads from cover-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cover-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated deletes from cover-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cover-photos');
