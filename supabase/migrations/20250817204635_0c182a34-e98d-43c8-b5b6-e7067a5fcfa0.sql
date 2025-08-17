-- Reapply with correct syntax: drop-then-create storage policies

-- PROFILES policies already adjusted previously, keep as-is

-- STORAGE.objects: replace policies to allow user uploads to profile-photos
DROP POLICY IF EXISTS "profile_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_delete_own" ON storage.objects;

CREATE POLICY "profile_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "profile_photos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "profile_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
