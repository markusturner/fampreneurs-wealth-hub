
-- Create trust_asset_uploads table
CREATE TABLE public.trust_asset_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('schedule_b', 'proof_of_transfer')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_asset_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
CREATE POLICY "Users can view own trust asset uploads"
  ON public.trust_asset_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert own trust asset uploads"
  ON public.trust_asset_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own trust asset uploads"
  ON public.trust_asset_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all uploads
CREATE POLICY "Admins can view all trust asset uploads"
  ON public.trust_asset_uploads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trust-asset-uploads', 'trust-asset-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload to their own folder
CREATE POLICY "Users can upload trust assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trust-asset-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own files
CREATE POLICY "Users can view own trust assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'trust-asset-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own files
CREATE POLICY "Users can delete own trust assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trust-asset-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
