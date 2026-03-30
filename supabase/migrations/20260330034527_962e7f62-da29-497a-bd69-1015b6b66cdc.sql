
-- Create legacy_meeting_uploads table
CREATE TABLE public.legacy_meeting_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('meeting_notes', 'attendance_confirmation', 'action_items', 'meeting_recording', 'signed_agreement', 'family_structure', 'family_constitution')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_meeting_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own legacy meeting uploads"
  ON public.legacy_meeting_uploads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own legacy meeting uploads"
  ON public.legacy_meeting_uploads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own legacy meeting uploads"
  ON public.legacy_meeting_uploads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all legacy meeting uploads"
  ON public.legacy_meeting_uploads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('legacy-meeting-uploads', 'legacy-meeting-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload legacy meeting files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legacy-meeting-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own legacy meeting files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legacy-meeting-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own legacy meeting files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'legacy-meeting-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
