-- Create tutorial-videos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and owners can upload tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tutorial videos" ON storage.objects;

-- RLS Policies for tutorial-videos bucket
-- Allow admins and owners to upload tutorial videos
CREATE POLICY "Admins and owners can upload tutorial videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutorial-videos' 
  AND (
    public.is_current_user_admin() 
    OR public.is_current_user_owner()
  )
);

-- Allow admins and owners to update tutorial videos
CREATE POLICY "Admins and owners can update tutorial videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tutorial-videos' 
  AND (
    public.is_current_user_admin() 
    OR public.is_current_user_owner()
  )
);

-- Allow admins and owners to delete tutorial videos
CREATE POLICY "Admins and owners can delete tutorial videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutorial-videos' 
  AND (
    public.is_current_user_admin() 
    OR public.is_current_user_owner()
  )
);

-- Allow everyone to view tutorial videos (public bucket)
CREATE POLICY "Anyone can view tutorial videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tutorial-videos');

-- Update app_settings RLS to allow admins and owners to manage tutorial video URL
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins and owners can manage app settings" ON public.app_settings;

CREATE POLICY "Admins and owners can manage app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (
  public.is_current_user_admin() 
  OR public.is_current_user_owner()
)
WITH CHECK (
  public.is_current_user_admin() 
  OR public.is_current_user_owner()
);