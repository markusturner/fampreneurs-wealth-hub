-- Remove broad SELECT policy on the public 'documents' bucket to prevent listing all files.
-- Public read access via getPublicUrl() continues to work because the bucket is public.
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;