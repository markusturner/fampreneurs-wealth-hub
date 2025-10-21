-- Create app_settings table for storing tutorial video URL
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  tutorial_video_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to update settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert default row
INSERT INTO public.app_settings (id, tutorial_video_url)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for tutorial videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tutorial videos
CREATE POLICY "Anyone can view tutorial videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'tutorial-videos');

CREATE POLICY "Admins can upload tutorial videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tutorial-videos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete tutorial videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tutorial-videos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );