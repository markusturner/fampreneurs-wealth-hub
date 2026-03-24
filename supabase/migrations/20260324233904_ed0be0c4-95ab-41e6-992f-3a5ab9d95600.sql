-- Create storage bucket for trust documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('trust-documents', 'trust-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create table to track uploaded trust documents
CREATE TABLE IF NOT EXISTS public.trust_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  trust_type text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trust_documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view trust documents
CREATE POLICY "Authenticated users can view trust documents"
  ON public.trust_documents FOR SELECT TO authenticated
  USING (true);

-- Only admins/owners can insert
CREATE POLICY "Admins can insert trust documents"
  ON public.trust_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

-- Only admins/owners can delete
CREATE POLICY "Admins can delete trust documents"
  ON public.trust_documents FOR DELETE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner());

-- Storage policies
CREATE POLICY "Anyone can read trust documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trust-documents');

CREATE POLICY "Admins can upload trust documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trust-documents' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins can delete trust documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trust-documents' AND (public.is_current_user_admin() OR public.is_current_user_owner()));